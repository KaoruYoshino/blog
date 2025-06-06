from flask_sqlalchemy import SQLAlchemy
from utils import get_current_time_jst

db = SQLAlchemy()

class User(db.Model):
    """ユーザー情報を管理するモデル。ユーザー名、パスワードハッシュなどを保持。"""
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)

    def set_password(self, password):
        from werkzeug.security import generate_password_hash
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        from werkzeug.security import check_password_hash
        return check_password_hash(self.password_hash, password)

class Post(db.Model):
    """ブログ記事を管理するモデル。タイトル、本文、作成日時などを保持。"""
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    body = db.Column(db.Text, nullable=False)
    image_path = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=get_current_time_jst)
    updated_at = db.Column(db.DateTime, default=get_current_time_jst, onupdate=get_current_time_jst)

class SiteInfo(db.Model):
    """サイトの概要情報を管理するモデル。サイト説明文などを保持。"""
    id = db.Column(db.Integer, primary_key=True)
    description = db.Column(db.Text, nullable=False)
    updated_at = db.Column(db.DateTime, default=get_current_time_jst, onupdate=get_current_time_jst)

class Venue(db.Model):
    """会場情報を管理するモデル。Google MapのplaceIdなどを保持。"""

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    placeId = db.Column(db.String(255), nullable=True)
    address = db.Column(db.String(255), nullable=True)
    lat = db.Column(db.Float, nullable=True)
    lng = db.Column(db.Float, nullable=True)

    def __repr__(self):
        return f'<Venue {self.name}>'

class Event(db.Model):
    """カレンダーの予定を管理するモデル。タイトル、日時、繰り返し設定、会場情報などを保持。"""

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    start = db.Column(db.DateTime, nullable=False)
    end = db.Column(db.DateTime, nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    description = db.Column(db.Text, nullable=True)
    recurrence_rule = db.Column(db.String(255), nullable=True)  # 単純な毎週繰り返しなどを表現
    venue_id = db.Column(db.Integer, db.ForeignKey('venue.id'), nullable=True)  # 会場情報の外部キー
    created_at = db.Column(db.DateTime, default=get_current_time_jst)
    updated_at = db.Column(db.DateTime, default=get_current_time_jst, onupdate=get_current_time_jst)

    user = db.relationship('User', backref=db.backref('event', lazy=True))
    venue = db.relationship('Venue', backref=db.backref('event', lazy=True))

    def __repr__(self):
        return f'<Event {self.title} ({self.start} - {self.end})>'

class Settings(db.Model):
    """サイトの設定を管理するモデル。管理者メールアドレスやreCAPTCHA設定などを保持。"""
    id = db.Column(db.Integer, primary_key=True)
    admin_email = db.Column(db.String(120), nullable=False)
    enable_recaptcha = db.Column(db.Boolean, default=True)
    updated_at = db.Column(db.DateTime, default=get_current_time_jst, onupdate=get_current_time_jst)

    def __repr__(self):
        return f'<Settings admin_email={self.admin_email}>'