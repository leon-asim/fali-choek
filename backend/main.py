"""Pickup games API: users, login (JWT), games, join, admin.
Run:  uvicorn main:app --host 0.0.0.0 --reload
Env:  SECRET_KEY (required in production), ADMIN_USERNAME + ADMIN_PASSWORD (creates the admin on startup),
      DATABASE_URL (default sqlite:///./pickup.db, use postgresql+psycopg://... later)
"""
import hashlib, hmac, os, re, secrets
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import Literal, Optional

import jwt
from fastapi import Depends, FastAPI, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint, create_engine, delete, inspect, select, text
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

SECRET = os.getenv("SECRET_KEY")
if not SECRET:
    SECRET = "dev-only-change-me"
    print("WARNING: SECRET_KEY not set, using an insecure dev key")
DB_URL = os.getenv("DATABASE_URL", "sqlite:///./pickup.db")
engine = create_engine(DB_URL, connect_args={"check_same_thread": False} if DB_URL.startswith("sqlite") else {})
SessionLocal = sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(200))
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)


class Game(Base):
    __tablename__ = "games"
    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    sport: Mapped[str] = mapped_column(String(20))
    city: Mapped[str] = mapped_column(String(30), index=True)
    need: Mapped[int] = mapped_column(Integer)
    squad: Mapped[int] = mapped_column(Integer)
    shirt: Mapped[str] = mapped_column(String(10))
    where: Mapped[str] = mapped_column(String(120))
    when: Mapped[datetime] = mapped_column(DateTime, index=True)  # naive UTC
    level: Mapped[str] = mapped_column(String(20))
    vibe: Mapped[str] = mapped_column(String(20))
    contact: Mapped[str] = mapped_column(String(60))
    note: Mapped[str] = mapped_column(String(300), default="")
    lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)


class Join(Base):
    __tablename__ = "joins"
    __table_args__ = (UniqueConstraint("user_id", "game_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    game_id: Mapped[int] = mapped_column(ForeignKey("games.id"), index=True)


# ---------- auth helpers ----------
def hash_pw(pw: str) -> str:
    salt = secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac("sha256", pw.encode(), bytes.fromhex(salt), 200_000).hex()
    return f"{salt}${h}"


def check_pw(pw: str, stored: str) -> bool:
    salt, h = stored.split("$")
    test = hashlib.pbkdf2_hmac("sha256", pw.encode(), bytes.fromhex(salt), 200_000).hex()
    return hmac.compare_digest(test, h)


def make_token(user: User) -> str:
    exp = datetime.now(timezone.utc) + timedelta(days=30)
    return jwt.encode({"sub": str(user.id), "exp": exp}, SECRET, algorithm="HS256")


def get_db():
    with SessionLocal() as db:
        yield db


bearer = HTTPBearer(auto_error=False)


def current_user(cred: Optional[HTTPAuthorizationCredentials] = Depends(bearer), db: Session = Depends(get_db)) -> User:
    if not cred:
        raise HTTPException(401, "Not logged in")
    try:
        uid = int(jwt.decode(cred.credentials, SECRET, algorithms=["HS256"])["sub"])
    except Exception:
        raise HTTPException(401, "Session expired, log in again")
    user = db.get(User, uid)
    if not user:
        raise HTTPException(401, "Account no longer exists")
    return user


def admin_only(user: User = Depends(current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(403, "Admins only")
    return user


# ---------- schemas ----------
CityT = Literal["Skopje", "Bitola", "Kumanovo", "Prilep", "Tetovo", "Ohrid", "Veles", "Štip", "Strumica",
                "Gostivar", "Kočani", "Kavadarci", "Kičevo", "Struga"]


class Creds(BaseModel):
    username: str = Field(min_length=3, max_length=30)
    password: str = Field(min_length=8, max_length=128)


class GameIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    sport: Literal["Football", "Basketball", "Volleyball", "Futsal", "Tennis", "Handball", "Other"]
    city: CityT
    need: int = Field(ge=1, le=30)
    squad: int = Field(ge=1, le=15)
    shirt: Literal["Dark", "Light", "Any"]
    where: str = Field(min_length=1, max_length=120)
    when: datetime
    level: Literal["Beginner", "Casual", "Intermediate", "Advanced"]
    vibe: Literal["Just for fun", "Tryhard"]
    contact: str = Field(min_length=1, max_length=60)
    note: str = Field("", max_length=300)
    lat: float = Field(ge=40.8, le=42.4)   # North Macedonia bounding box
    lng: float = Field(ge=20.4, le=23.1)


def user_out(u: User):
    return {"id": u.id, "username": u.username, "is_admin": u.is_admin}


def to_utc_naive(d: datetime) -> datetime:
    return d.astimezone(timezone.utc).replace(tzinfo=None) if d.tzinfo else d


def game_out(g: Game, owner: str, joined: bool, players=None):
    return {"id": g.id, "owner_id": g.owner_id, "owner_name": owner, "sport": g.sport, "city": g.city,
            "need": g.need, "squad": g.squad, "shirt": g.shirt, "where": g.where,
            "when": g.when.isoformat() + "Z", "level": g.level, "vibe": g.vibe, "contact": g.contact,
            "note": g.note, "joined": joined,
            "lat": g.lat, "lng": g.lng, "players": players or []}


# ---------- app ----------
@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)
    # tiny migration: add columns introduced later to an existing games table
    cols = {c["name"] for c in inspect(engine).get_columns("games")}
    with engine.begin() as conn:
        for name in ("lat", "lng"):
            if name not in cols:
                conn.execute(text(f"ALTER TABLE games ADD COLUMN {name} FLOAT"))
    name, pw = os.getenv("ADMIN_USERNAME"), os.getenv("ADMIN_PASSWORD")
    if name and pw:
        with SessionLocal() as db:
            u = db.scalar(select(User).where(User.username == name.lower()))
            if not u:
                db.add(User(username=name.lower(), password_hash=hash_pw(pw), is_admin=True))
            else:
                u.is_admin = True
            db.commit()
    yield


app = FastAPI(title="Fali choek API", lifespan=lifespan)


@app.post("/auth/register", status_code=201)
def register(c: Creds, db: Session = Depends(get_db)):
    name = c.username.strip().lower()
    if not re.fullmatch(r"[a-z0-9_]{3,30}", name):
        raise HTTPException(422, "Username: 3-30 letters, numbers or underscore")
    if db.scalar(select(User).where(User.username == name)):
        raise HTTPException(409, "Username already taken")
    u = User(username=name, password_hash=hash_pw(c.password))
    db.add(u)
    db.commit()
    return {"token": make_token(u), "user": user_out(u)}


@app.post("/auth/login")
def login(c: Creds, db: Session = Depends(get_db)):
    u = db.scalar(select(User).where(User.username == c.username.strip().lower()))
    if not u or not check_pw(c.password, u.password_hash):
        raise HTTPException(401, "Wrong username or password")
    return {"token": make_token(u), "user": user_out(u)}


@app.get("/me")
def me(user: User = Depends(current_user)):
    return user_out(user)


def players_map(db: Session, ids):
    out = {}
    if ids:
        q = (select(Join.game_id, User.username).join(User, User.id == Join.user_id)
             .where(Join.game_id.in_(ids)).order_by(Join.id))
        for gid, uname in db.execute(q):
            out.setdefault(gid, []).append(uname)
    return out


@app.get("/games")
def list_games(sport: Optional[str] = None, city: Optional[str] = None,
               user: User = Depends(current_user), db: Session = Depends(get_db)):
    cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=3)
    q = select(Game, User.username).join(User, User.id == Game.owner_id).where(Game.when >= cutoff)
    if sport:
        q = q.where(Game.sport == sport)
    if city:
        q = q.where(Game.city == city)
    rows = db.execute(q.order_by(Game.when)).all()
    mine = set(db.scalars(select(Join.game_id).where(Join.user_id == user.id)))
    players = players_map(db, [g.id for g, _ in rows])
    # only the creator (and admins) see who joined
    return [game_out(g, owner, g.id in mine, players.get(g.id, []) if (user.is_admin or g.owner_id == user.id) else [])
            for g, owner in rows]


@app.post("/games", status_code=201)
def create_game(body: GameIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    data = body.model_dump()
    data["when"] = to_utc_naive(data["when"])
    # idempotent: a repeated tap/request for the same game returns the existing one
    dup = db.scalar(select(Game).where(Game.owner_id == user.id, Game.sport == data["sport"], Game.city == data["city"],
                                       Game.where == data["where"], Game.when == data["when"]))
    if dup:
        return game_out(dup, user.username, False)
    g = Game(owner_id=user.id, **data)
    db.add(g)
    db.commit()
    return game_out(g, user.username, False)


def load_game(db: Session, gid: int) -> Game:
    g = db.get(Game, gid)
    if not g:
        raise HTTPException(404, "Game not found")
    return g


@app.put("/games/{gid}")
def update_game(gid: int, body: GameIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    g = load_game(db, gid)
    if g.owner_id != user.id and not user.is_admin:
        raise HTTPException(403, "Not your game")
    data = body.model_dump()
    data["when"] = to_utc_naive(data["when"])
    for k, v in data.items():
        setattr(g, k, v)
    db.commit()
    owner = db.get(User, g.owner_id)
    joined = db.scalar(select(Join.id).where(Join.user_id == user.id, Join.game_id == gid)) is not None
    return game_out(g, owner.username, joined, players_map(db, [g.id]).get(g.id, []))


@app.delete("/games/{gid}", status_code=204)
def delete_game(gid: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    g = load_game(db, gid)
    if g.owner_id != user.id and not user.is_admin:
        raise HTTPException(403, "Not your game")
    db.execute(delete(Join).where(Join.game_id == gid))
    db.delete(g)
    db.commit()


@app.post("/games/{gid}/join")
def join_game(gid: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    g = load_game(db, gid)
    if g.owner_id == user.id:
        raise HTTPException(400, "This is your own game")
    if db.scalar(select(Join.id).where(Join.user_id == user.id, Join.game_id == gid)):
        raise HTTPException(409, "You already joined")
    if g.need < 1:
        raise HTTPException(400, "Game is full")
    g.need -= 1
    db.add(Join(user_id=user.id, game_id=gid))
    db.commit()
    return {"ok": True, "need": g.need}


# ---------- admin ----------
@app.get("/admin/users")
def admin_users(_: User = Depends(admin_only), db: Session = Depends(get_db)):
    return [user_out(u) for u in db.scalars(select(User).order_by(User.id))]


@app.delete("/admin/users/{uid}", status_code=204)
def admin_delete_user(uid: int, admin: User = Depends(admin_only), db: Session = Depends(get_db)):
    if uid == admin.id:
        raise HTTPException(400, "You can't delete yourself")
    u = db.get(User, uid)
    if not u:
        raise HTTPException(404, "User not found")
    gids = list(db.scalars(select(Game.id).where(Game.owner_id == uid)))
    if gids:
        db.execute(delete(Join).where(Join.game_id.in_(gids)))
        db.execute(delete(Game).where(Game.id.in_(gids)))
    db.execute(delete(Join).where(Join.user_id == uid))
    db.delete(u)
    db.commit()
