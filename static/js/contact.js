document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contactForm');
    
    // フォームのバリデーション設定
    function validateForm() {
        let isValid = true;
        
        // メールアドレスのバリデーション
        const email = document.getElementById('email');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email.value || !emailRegex.test(email.value)) {
            email.classList.add('is-invalid');
            isValid = false;
        } else {
            email.classList.remove('is-invalid');
        }
        
        // 件名のバリデーション
        const subject = document.getElementById('subject');
        if (!subject.value.trim()) {
            subject.classList.add('is-invalid');
            isValid = false;
        } else {
            subject.classList.remove('is-invalid');
        }
        
        // メッセージのバリデーション
        const message = document.getElementById('message');
        if (!message.value.trim()) {
            message.classList.add('is-invalid');
            isValid = false;
        } else {
            message.classList.remove('is-invalid');
        }
        
        return isValid;
    }

    // フォーム送信時の処理
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // ハニーポットチェック
        const honeypot = document.getElementById('website');
        if (honeypot.value) {
            console.log('Spam detected');
            return false;
        }

        // フォームのバリデーション
        if (!validateForm()) {
            return false;
        }

        // reCAPTCHAのチェック（有効な場合）
        if (typeof grecaptcha !== 'undefined') {
            const recaptchaResponse = grecaptcha.getResponse();
            if (!recaptchaResponse) {
                alert('reCAPTCHAの確認をお願いします。');
                return false;
            }
        }

        // フォームの送信
        fetch(contactForm.action, {
            method: 'POST',
            body: new FormData(contactForm),
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // 成功メッセージを表示
                const alert = document.createElement('div');
                alert.className = 'alert alert-success alert-dismissible fade show';
                alert.innerHTML = `
                    ${data.message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                `;
                contactForm.insertAdjacentElement('beforebegin', alert);

                // フォームをリセット
                contactForm.reset();
                if (typeof grecaptcha !== 'undefined') {
                    grecaptcha.reset();
                }

                // 3秒後にトップページへリダイレクト
                setTimeout(() => {
                    window.location.href = '/';
                }, 3000);
            } else {
                // エラーメッセージを表示
                alert(data.message || 'エラーが発生しました。もう一度お試しください。');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('エラーが発生しました。もう一度お試しください。');
        });
    });

    // リアルタイムバリデーション
    const inputs = contactForm.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            if (this.id !== 'website') { // ハニーポットフィールドは除外
                if (!this.value.trim()) {
                    this.classList.add('is-invalid');
                } else {
                    this.classList.remove('is-invalid');
                }
            }
        });
    });
});