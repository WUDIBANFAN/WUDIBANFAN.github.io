document.addEventListener('DOMContentLoaded', () => {
    const newsContainer = document.getElementById('news-container');

// 你的 Bing News API Key 和终端地址
  const API_KEY = 'YOUR_BING_API_KEY'; // <-- 替换为你的密钥
  const ENDPOINT = 'https://api.bing.microsoft.com/v7.0/news/search';
  const QUERY = '水处理 OR 水污染 OR 水资源 AI';

fetch(`${ENDPOINT}?q=${encodeURIComponent(QUERY)}&mkt=zh-CN&count=5`, {
    method: 'GET',
    headers: {
        'Ocp-Apim-Subscription-Key': API_KEY
    }
})
    .then(response => response.json())
    .then(data => {
        const articles = data.value || [];
if (articles.length === 0) {
    newsContainer.innerHTML = '<p>暂无最新新闻。</p>';
    return;
}

articles.forEach(article => {
    const card = document.createElement('div');
card.className = 'news-card';

        const title = document.createElement('h4');
title.textContent = article.name;

        const summary = document.createElement('p');
summary.textContent = article.description || '暂无摘要';

card.appendChild(title);
card.appendChild(summary);
newsContainer.appendChild(card);
});
})
    .catch(error => {
        console.error('抓取新闻失败：', error);
newsContainer.innerHTML = '<p>加载新闻时出错，请稍后再试。</p>';
});
});
