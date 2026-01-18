# 志愿者活动登记（Cloudflare Pages + D1）

这是一个可直接部署到 Cloudflare Pages 的志愿者活动登记系统，支持活动管理、用户审核、登记与统计。项目在首次访问 API 时自动初始化 D1 数据库，无需运行迁移命令。

## 功能说明

- 用户侧：填写工号、姓名，选择活动并提交登记。
- 提交模式：
  - `append`：保留此前活动并更新当前选择。
  - `reset`：删除该员工全部旧记录再写入本次选择。
- 审核规则：用户提交后状态为 `pending`，管理员审核通过后，该用户历史与未来提交才计入统计（无需重新提交）。
- 管理员侧：
  - 审核用户（pending/approved/rejected）。
  - 管理活动（增/改/删）。
  - 查看登记记录、按用户状态筛选、删除单条登记。
  - 导出 CSV（正确转义逗号、引号与换行）。
  - 数据初始化重置（清空数据并重建表结构）。
  - 统计视图仅统计 `approved` 用户的提交数据。

## 本地开发

1. 安装依赖（如需）：
   ```bash
   npm install
   ```
2. 启动开发服务器：
   ```bash
   wrangler pages dev public --d1 DB
   ```

> 说明：项目不依赖迁移命令，首次访问 API 会自动建表/建索引。

## 部署到 Cloudflare Pages

1. 将本仓库推送到 GitHub。
2. 在 Cloudflare Pages 创建项目并连接 GitHub 仓库。
3. 在 Pages 项目设置中绑定 D1：
   - Binding 名称必须为 `DB`。
4. 设置环境变量：
   - `ADMIN_PASSWORD`：管理员密码。
5. 部署完成后直接访问页面；首次访问 API 将自动创建表结构与索引，无需运行迁移命令。

## 目录结构

```
/functions
  _utils.js
  /api
    /activities
      index.js
      [id].js
    /users
      index.js
      [id].js
    /submissions
      index.js
      [id].js
    reset.js
    stats.js
/migrations
  0001_init.sql
/public
  index.html
  admin.html
  app.js
  admin.js
  styles.css
wrangler.toml
README.MD
```
