document.addEventListener('DOMContentLoaded', () => {
  // 滚动触发动画
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

  // 导航激活状态切换
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
});
