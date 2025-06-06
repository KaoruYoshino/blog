from dotenv import load_dotenv
import os
from flask import Flask, render_template, request, redirect, url_for, flash, session, abort, current_app, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from markdown import markdown
from models import db, User, Post, SiteInfo, Event, Venue, Settings
from forms import ContactForm
from flask_mail import Mail, Message
from flask_wtf.csrf import CSRFProtect
from datetime import datetime
from flask_migrate import Migrate
from werkzeug.utils import secure_filename
import uuid

app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {"origins": ["http://localhost:5000", "http://127.0.0.1:5000"]}
})
load_dotenv()
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev_secret_key')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:////app/instance/blog.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['GOOGLE_MAPS_API_KEY'] = os.environ.get('GOOGLE_MAPS_API_KEY', '')

# メール設定
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'True').lower() == 'true'
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER')

# reCAPTCHA設定
app.config['RECAPTCHA_ENABLED'] = os.getenv('RECAPTCHA_ENABLED', 'True').lower() == 'true'
app.config['RECAPTCHA_SITE_KEY'] = os.getenv('RECAPTCHA_SITE_KEY', '')
app.config['RECAPTCHA_SECRET_KEY'] = os.getenv('RECAPTCHA_SECRET_KEY', '')

db.init_app(app)
migrate = Migrate(app, db)
mail = Mail(app)
csrf = CSRFProtect(app)

def send_contact_email(form_data):
    """問い合わせメールを送信する関数"""
    try:
        # 管理者メールアドレスの取得
        settings = Settings.query.first()
        if not settings or not settings.admin_email:
            current_app.logger.error("管理者メールアドレスが設定されていません。")
            return False

        # メール本文の作成
        body = f"""
新しい問い合わせが届きました。

お名前: {form_data.name.data if form_data.name.data else '未入力'}
メールアドレス: {form_data.email.data}
件名: {form_data.subject.data}

お問い合わせ内容:
{form_data.message.data}
        """

        # メールの送信
        msg = Message(
            subject=f'[お問い合わせ] {form_data.subject.data}',
            recipients=[settings.admin_email],
            body=body,
            reply_to=form_data.email.data
        )
        mail.send(msg)
        return True
    except Exception as e:
        current_app.logger.error(f"メール送信エラー: {e}")
        return False

@app.route('/contact', methods=['GET', 'POST'])
def contact():
    """問い合わせフォームの処理"""
    form = ContactForm()
    
    if request.method == 'POST':
        # AJAXリクエストかどうかを確認
        is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
        
        if form.validate_on_submit():
            # ハニーポットチェック
            if form.website.data:
                if is_ajax:
                    return jsonify({'success': False, 'message': 'スパムと判断されました。'}), 400
                flash('スパムと判断されました。', 'error')
                return redirect(url_for('contact'))

            # メール送信
            if send_contact_email(form):
                if is_ajax:
                    return jsonify({
                        'success': True,
                        'message': 'お問い合わせを送信しました。'
                    })
                flash('お問い合わせを送信しました。', 'success')
                return redirect(url_for('index'))
            else:
                if is_ajax:
                    return jsonify({
                        'success': False,
                        'message': 'メールの送信に失敗しました。しばらく経ってからもう一度お試しください。'
                    }), 500
                flash('メールの送信に失敗しました。しばらく経ってからもう一度お試しください。', 'error')
        else:
            if is_ajax:
                return jsonify({
                    'success': False,
                    'message': '入力内容を確認してください。',
                    'errors': form.errors
                }), 400

    return render_template('contact.html', form=form)

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

# 会場一覧取得API
@app.route('/api/venues', methods=['GET'])
def get_venues():
    if not session.get('user_id'):
        return jsonify({'error': 'ログインが必要です。'}), 401
    try:
        venues = Venue.query.all()
        venue_list = []
        for venue in venues:
            venue_list.append({
                'id': venue.id,
                'name': venue.name,
                'placeId': venue.placeId,
                'address': venue.address,
                'lat': venue.lat,
                'lng': venue.lng
            })
        return jsonify(venue_list)
    except Exception as e:
        current_app.logger.error(f"Error in get_venues: {e}")
        return jsonify({'error': 'サーバーエラーが発生しました。'}), 500

# 会場追加API
@app.route('/api/venues', methods=['POST'])
def create_venue():
    if not session.get('user_id'):
        return jsonify({'error': 'ログインが必要です。'}), 401
    data = request.get_json()
    try:
        venue = Venue(
            name=data['name'],
            placeId=data.get('placeId'),
            address=data.get('address'),
            lat=data.get('lat'),
            lng=data.get('lng')
        )
        db.session.add(venue)
        db.session.commit()
        return jsonify({'message': '会場を追加しました。', 'id': venue.id}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# 会場編集API
@app.route('/api/venues/<int:venue_id>', methods=['PUT'])
def update_venue(venue_id):
    if not session.get('user_id'):
        return jsonify({'error': 'ログインが必要です。'}), 401
    venue = Venue.query.get_or_404(venue_id)
    data = request.get_json()
    try:
        venue.name = data['name']
        venue.placeId = data.get('placeId')
        venue.address = data.get('address')
        venue.lat = data.get('lat')
        venue.lng = data.get('lng')
        db.session.commit()
        return jsonify({'message': '会場を更新しました。'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# 会場削除API
@app.route('/api/venues/<int:venue_id>', methods=['DELETE'])
def delete_venue(venue_id):
    if not session.get('user_id'):
        return jsonify({'error': 'ログインが必要です。'}), 401
    venue = Venue.query.get_or_404(venue_id)
    try:
        db.session.delete(venue)
        db.session.commit()
        return jsonify({'message': '会場を削除しました。'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# サイト概要編集API
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

# 記事投稿API
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

# 記事編集API
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

# 記事削除API
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

# 会場管理画面
@app.route('/venue/manage')
def venue_manage_view():
    if not session.get('user_id'):
        flash('ログインが必要です。')
        return redirect(url_for('login'))
    venues = Venue.query.all()
    return render_template('venue_manage.html',
                         venues=venues,
                         google_maps_api_key=app.config['GOOGLE_MAPS_API_KEY'])

# 予定一覧取得API
@app.route('/api/events', methods=['GET'])
def get_events():
    if not session.get('user_id'):
        return jsonify({'error': 'ログインが必要です。'}), 401
    try:
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
                'venue': {
                    'id': event.venue.id if event.venue else None,
                    'name': event.venue.name if event.venue else None,
                    'placeId': event.venue.placeId if event.venue else None,
                    'address': event.venue.address if event.venue else None,
                    'lat': event.venue.lat if event.venue else None,
                    'lng': event.venue.lng if event.venue else None,
                },
                'user_id': event.user_id
            })
        return jsonify(event_list)
    except Exception as e:
        current_app.logger.error(f"Error in get_events: {e}")
        return jsonify({'error': 'サーバーエラーが発生しました。'}), 500

# 予定追加API
@app.route('/api/events', methods=['POST'])
def create_event():
    if not session.get('user_id'):
        return jsonify({'error': 'ログインが必要です。'}), 401
    data = request.get_json()
    try:
        # venue_idが指定されている場合は、会場の存在確認
        venue_id = data.get('venue_id')
        if venue_id:
            venue = Venue.query.get(venue_id)
            if not venue:
                return jsonify({'error': '指定された会場が見つかりません。'}), 404

        event = Event(
            title=data['title'],
            start=datetime.fromisoformat(data['start']),
            end=datetime.fromisoformat(data['end']) if data.get('end') else None,
            venue_id=venue_id,
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
        # venue_idが指定されている場合は、会場の存在確認
        venue_id = data.get('venue_id')
        if venue_id:
            venue = Venue.query.get(venue_id)
            if not venue:
                return jsonify({'error': '指定された会場が見つかりません。'}), 404

        event.title = data['title']
        event.start = datetime.fromisoformat(data['start'])
        event.end = datetime.fromisoformat(data['end']) if data.get('end') else None
        event.venue_id = venue_id
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

@app.route('/admin/settings', methods=['GET', 'POST'])
def admin_settings():
    """管理者設定の処理"""
    if not session.get('user_id'):
        flash('ログインが必要です。')
        return redirect(url_for('login'))

    settings = Settings.query.first()
    if not settings:
        settings = Settings(
            admin_email=app.config['MAIL_DEFAULT_SENDER'],
            enable_recaptcha=app.config['RECAPTCHA_ENABLED']
        )
        db.session.add(settings)
        db.session.commit()

    if request.method == 'POST':
        email = request.form.get('admin_email', '').strip()
        enable_recaptcha = request.form.get('enable_recaptcha') == 'on'

        if not email:
            flash('管理者メールアドレスは必須です。', 'error')
        else:
            settings.admin_email = email
            settings.enable_recaptcha = enable_recaptcha
            db.session.commit()
            flash('設定を更新しました。', 'success')
            return redirect(url_for('admin_settings'))

    return render_template('admin/settings.html', settings=settings)

def init_settings():
    """初期設定の確認と作成"""
    try:
        settings = Settings.query.first()
        if not settings:
            settings = Settings(
                admin_email=app.config['MAIL_DEFAULT_SENDER'],
                enable_recaptcha=app.config['RECAPTCHA_ENABLED']
            )
            db.session.add(settings)
            db.session.commit()
            current_app.logger.info("管理者設定を初期化しました。")
    except Exception as e:
        current_app.logger.error(f"初期設定の作成に失敗しました: {e}")

# アプリケーション起動時に初期設定を確認
with app.app_context():
    init_settings()