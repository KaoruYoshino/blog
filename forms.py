from flask_wtf import FlaskForm, RecaptchaField
from wtforms import StringField, TextAreaField
from wtforms.validators import DataRequired, Email, Length

class ContactForm(FlaskForm):
    """お問い合わせフォームのフォームクラス"""
    name = StringField('お名前',
                      validators=[Length(max=100)])
    
    email = StringField('メールアドレス',
                       validators=[DataRequired(message='メールアドレスを入力してください。'),
                                 Email(message='有効なメールアドレスを入力してください。'),
                                 Length(max=120)])
    
    subject = StringField('件名',
                         validators=[DataRequired(message='件名を入力してください。'),
                                   Length(max=200)])
    
    message = TextAreaField('お問い合わせ内容',
                          validators=[DataRequired(message='お問い合わせ内容を入力してください。'),
                                    Length(max=3000)])
    
    # ハニーポットフィールド（スパム対策）
    website = StringField('Website')
    
    # reCAPTCHAフィールド（設定が有効な場合にのみ表示）
    recaptcha = RecaptchaField()