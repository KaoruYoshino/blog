import os
from flask import Flask, render_template, request, redirect, url_for, flash, session, abort
from werkzeug.security import generate_password_hash, check_password_hash
from markdown import markdown
from models import db, User, Post, SiteInfo
from flask_migrate import Migrate

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev_secret_key')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:////app/instance/blog.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)
migrate = Migrate(app, db)

@app.route('/')
def index():
    posts = Post.query.order_by(Post.created_at.desc()).all()
    site_info = SiteInfo.query.first()
    return render_template('index.html', posts=posts, site_info=site_info)

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

# ログアウト処理
@app.route('/logout')
def logout():
    session.pop('user_id', None)
    flash('ログアウトしました。')
    return redirect(url_for('index'))

# 記事投稿
@app.route('/post/create', methods=['GET', 'POST'])
def post_create():
    if not session.get('user_id'):
        flash('ログインが必要です。')
        return redirect(url_for('login'))
    if request.method == 'POST':
        title = request.form['title']
        body = request.form['body']
        if not title or not body:
            flash('タイトルと本文は必須です。')
            return render_template('post_form.html')
        post = Post(title=title, body=body)
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
        if not title or not body:
            flash('タイトルと本文は必須です。')
            return render_template('post_form.html', post=post)
        post.title = title
        post.body = body
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
    return redirect(url_for('index'))