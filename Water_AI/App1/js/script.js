document.addEventListener('DOMContentLoaded', () => {
    // 滚动动画效果
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
            }
        });
    }, {
        threshold: 0.1
    });

    const fadeElements = document.querySelectorAll('.section, .cta-button');
    fadeElements.forEach(el => observer.observe(el));

    // 导航激活切换
    const navLinks = document.querySelectorAll('nav ul li a');
    navLinks.forEach(link => {
        link.addEventListener('click', function () {
            navLinks.forEach(item => item.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // 表单提交处理
    const contactForm = document.getElementById('contact-form');
    contactForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        alert(`感谢您的留言，${name}！\n我们将会尽快回复您的邮箱：${email}`);
        contactForm.reset();
    });

    // 获取新闻
    fetch('/api/news')
        .then(response => response.json())
        .then(data => {
            const newsList = document.getElementById('news-list');
            data.forEach(item => {
                const li = document.createElement('li');
                const title = document.createElement('h3');
                title.textContent = item.title;
                const summary = document.createElement('p');
                summary.textContent = item.summary;
                li.appendChild(title);
                li.appendChild(summary);
                newsList.appendChild(li);
            });
        })
        .catch(error => {
            console.error('无法加载新闻:', error);
        });
});
