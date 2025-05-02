import os
from flask import Flask, render_template, request, redirect, url_for, flash, session, abort, current_app, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from markdown import markdown
from models import db, User, Post, SiteInfo, Event
from datetime import datetime
from flask_migrate import Migrate
from werkzeug.utils import secure_filename
import uuid

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev_secret_key')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:////app/instance/blog.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = 'static/uploads'

db.init_app(app)
migrate = Migrate(app, db)

#トップページ
@app.route('/')
def index():
    posts = Post.query.order_by(Post.created_at.desc()).all()
    site_info = SiteInfo.query.first()
    return render_template('index.html', posts=posts, site_info=site_info)

# 記事詳細表示
@app.route('/post/<int:post_id>')
def post_detail(post_id):
    post = Post.query.get_or_404(post_id)
    # MarkdownをHTMLに変換
    post_body_html = markdown(post.body)
    return render_template('post_detail.html', post=post, post_body_html=post_body_html)

# ログイン処理
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user = User.query.filter_by(username=username).first()
        if user and user.check_password(password):
            session['user_id'] = user.id
            flash('ログインしました。')
            return redirect(url_for('index'))
        else:
            flash('ユーザー名かパスワードが間違っています。')
    return render_template('login.html')

# ログアウト処理
@app.route('/logout')
def logout():
    session.pop('user_id', None)
    return redirect(url_for('index'))

# カレンダー管理画面
@app.route('/calendar/manage')
def calendar_manage():
    if not session.get('user_id'):
        flash('ログインが必要です。')
        return redirect(url_for('login'))
    return render_template('calendar_manage.html')

# 予定一覧取得API
@app.route('/api/events', methods=['GET'])
def get_events():
    if not session.get('user_id'):
        return jsonify({'error': 'ログインが必要です。'}), 401
    events = Event.query.all()
    event_list = []
    for event in events:
        event_list.append({
            'id': event.id,
            'title': event.title,
            'start': event.start.isoformat(),
            'end': event.end.isoformat() if event.end else None,
            'description': event.description,
            'recurrence_rule': event.recurrence_rule,
            'location': event.location,
            'user_id': event.user_id
        })
    return jsonify(event_list)

# サイト概要編集
@app.route('/admin/siteinfo', methods=['GET', 'POST'])
def edit_siteinfo():
    if 'user_id' not in session:
        flash('ログインが必要です。')
        return redirect(url_for('login'))

    site_info = SiteInfo.query.first()
    if not site_info:
        site_info = SiteInfo(description='')

    if request.method == 'POST':
        description = request.form.get('description', '').strip()
        if not description:
            flash('サイト概要は必須です。')
            return render_template('site_info_form.html', site_info=site_info)
        site_info.description = description
        db.session.add(site_info)
        db.session.commit()
        flash('サイト概要を更新しました。')
        return redirect(url_for('index'))

    return render_template('site_info_form.html', site_info=site_info)

# 記事投稿
@app.route('/post/create', methods=['GET', 'POST'])
def post_create():
    if not session.get('user_id'):
        flash('ログインが必要です。')
        return redirect(url_for('login'))
    if request.method == 'POST':
        title = request.form['title']
        body = request.form['body']
        image = request.files.get('image')
        if not title or not body:
            flash('タイトルと本文は必須です。')
            return render_template('post_form.html')
        post = Post(title=title, body=body)
        if image and allowed_file(image.filename):
            # ファイル名はUUIDのみで生成し日本語を排除
            ext = image.filename.rsplit('.', 1)[1].lower()
            unique_filename = f"{uuid.uuid4().hex}.{ext}"
            image_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
            image.save(os.path.join(current_app.root_path, image_path))
            post.image_path = image_path
        db.session.add(post)
        db.session.commit()
        flash('記事を投稿しました。')
        return redirect(url_for('index'))
    return render_template('post_form.html')

# 記事編集
@app.route('/post/<int:post_id>/edit', methods=['GET', 'POST'])
def post_edit(post_id):
    if not session.get('user_id'):
        flash('ログインが必要です。')
        return redirect(url_for('login'))
    post = Post.query.get_or_404(post_id)
    if request.method == 'POST':
        title = request.form['title']
        body = request.form['body']
        image = request.files.get('image')
        if not title or not body:
            flash('タイトルと本文は必須です。')
            return render_template('post_form.html', post=post)
        post.title = title
        post.body = body
        if image and allowed_file(image.filename):
            filename = secure_filename(image.filename)
            image_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            image.save(os.path.join(current_app.root_path, image_path))
            post.image_path = image_path
        db.session.commit()
        flash('記事を更新しました。')
        return redirect(url_for('post_detail', post_id=post.id))
    return render_template('post_form.html', post=post)

# 記事削除
@app.route('/post/<int:post_id>/delete', methods=['POST'])
def post_delete(post_id):
    if not session.get('user_id'):
        flash('ログインが必要です。')
        return redirect(url_for('login'))
    post = Post.query.get_or_404(post_id)
    db.session.delete(post)
    db.session.commit()
    flash('記事を削除しました。')

# カレンダー管理画面
@app.route('/calendar/manage')
def calendar_manage_view():
    if not session.get('user_id'):
        flash('ログインが必要です。')
        return redirect(url_for('login'))
    return render_template('calendar_manage.html')

# 予定一覧取得API
@app.route('/api/events', methods=['GET'])
def get_events_view():
    if not session.get('user_id'):
        return jsonify({'error': 'ログインが必要です。'}), 401
    events = Event.query.all()
    event_list = []
    for event in events:
        event_list.append({
            'id': event.id,
            'title': event.title,
            'start': event.start.isoformat(),
            'end': event.end.isoformat() if event.end else None,
            'description': event.description,
            'recurrence_rule': event.recurrence_rule,
            'location': event.location,
            'user_id': event.user_id
        })
    return jsonify(event_list)

# 予定追加API
@app.route('/api/events', methods=['POST'])
def create_event():
    if not session.get('user_id'):
        return jsonify({'error': 'ログインが必要です。'}), 401
    data = request.get_json()
    try:
        event = Event(
            title=data['title'],
            start=datetime.fromisoformat(data['start']),
            end=datetime.fromisoformat(data['end']) if data.get('end') else None,
            location=data.get('location'),
            recurrence_rule=data.get('recurrence_rule'),
            description=data.get('description'),
            user_id=session['user_id']
        )
        db.session.add(event)
        db.session.commit()
        return jsonify({'message': '予定を追加しました。', 'id': event.id}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# 予定編集API
@app.route('/api/events/<int:event_id>', methods=['PUT'])
def update_event(event_id):
    if not session.get('user_id'):
        return jsonify({'error': 'ログインが必要です。'}), 401
    event = Event.query.get_or_404(event_id)
    if event.user_id != session['user_id']:
        return jsonify({'error': '権限がありません。'}), 403
    data = request.get_json()
    try:
        event.title = data['title']
        event.start = datetime.fromisoformat(data['start'])
        event.end = datetime.fromisoformat(data['end']) if data.get('end') else None
        event.location = data.get('location')
        event.recurrence_rule = data.get('recurrence_rule')
        event.description = data.get('description')
        db.session.commit()
        return jsonify({'message': '予定を更新しました。'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# 予定削除API
@app.route('/api/events/<int:event_id>', methods=['DELETE'])
def delete_event(event_id):
    if not session.get('user_id'):
        return jsonify({'error': 'ログインが必要です。'}), 401
    event = Event.query.get_or_404(event_id)
    if event.user_id != session['user_id']:
        return jsonify({'error': '権限がありません。'}), 403
    db.session.delete(event)
    db.session.commit()
    return jsonify({'message': '予定を削除しました。'})

# 画像アップロード
@app.route('/upload_image', methods=['POST'])
def upload_image():
    if 'image' not in request.files:
        return jsonify({'error': 'No image part'}), 400
    image = request.files['image']
    if image.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    ext = image.filename.rsplit('.', 1)[1].lower()
    if ext not in {'png', 'jpg', 'jpeg', 'gif'}:
        return jsonify({'error': 'Invalid file extension'}), 400
    unique_filename = f"{uuid.uuid4().hex}.{ext}"
    upload_folder = current_app.config.get('UPLOAD_FOLDER', 'static/uploads')
    image_path = f"{upload_folder}/{unique_filename}"
    image.save(f"{current_app.root_path}/{image_path}")
    return jsonify({'image_path': f"/{image_path}"})

# 画像形式のチェック
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'png', 'jpg', 'jpeg', 'gif'}