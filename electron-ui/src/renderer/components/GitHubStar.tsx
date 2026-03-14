import React, { useState, useEffect } from 'react';
import { Button, Tooltip } from 'antd';
import { GithubOutlined, StarOutlined } from '@ant-design/icons';
import './GitHubStar.css';

// GitHub 仓库信息
const REPO_OWNER = 'JSREI';
const REPO_NAME = 'force-fuck-captcha-background';
const REPO_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}`;

// 缓存键名
const CACHE_KEY = 'github_stars';
const CACHE_EXPIRY_KEY = 'github_stars_expiry';
// 缓存有效期（1小时）
const CACHE_DURATION = 60 * 60 * 1000;

const GitHubStar: React.FC = () => {
  const [stars, setStars] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchStars = async () => {
      // 检查缓存
      const cachedStars = localStorage.getItem(CACHE_KEY);
      const cacheExpiry = localStorage.getItem(CACHE_EXPIRY_KEY);
      
      // 如果缓存有效，直接使用缓存数据
      if (cachedStars && cacheExpiry && Date.now() < parseInt(cacheExpiry)) {
        setStars(parseInt(cachedStars));
        return;
      }
      
      setLoading(true);
      try {
        // 获取 GitHub 仓库信息
        const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`);
        if (response.ok) {
          const data = await response.json();
          const starCount = data.stargazers_count;
          
          // 更新缓存
          localStorage.setItem(CACHE_KEY, starCount.toString());
          localStorage.setItem(CACHE_EXPIRY_KEY, (Date.now() + CACHE_DURATION).toString());
          
          setStars(starCount);
        } else {
          console.error('获取 GitHub 仓库信息失败:', response.statusText);
        }
      } catch (error) {
        console.error('获取 GitHub 仓库信息出错:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStars();
  }, []);

  // 打开 GitHub 仓库页面
  const openGitHubRepo = () => {
    if ((window as any).electronAPI && (window as any).electronAPI.openExternalLink) {
      (window as any).electronAPI.openExternalLink(REPO_URL);
    } else {
      // 后备方案，使用普通的链接打开
      window.open(REPO_URL, '_blank');
    }
  };

  const label = stars !== null ? (
    <span>
      <StarOutlined /> {stars}
    </span>
  ) : (
    <span>
      <StarOutlined /> --
    </span>
  );

  return (
    <Tooltip title="去 GitHub 点个 Star 支持我们">
      <Button
        type="link"
        className="github-star-button"
        onClick={openGitHubRepo}
        icon={<GithubOutlined />}
        loading={loading}
        aria-label="去 GitHub 点个 Star 支持我们"
      >
        {label}
      </Button>
    </Tooltip>
  );
};

export default GitHubStar; 
