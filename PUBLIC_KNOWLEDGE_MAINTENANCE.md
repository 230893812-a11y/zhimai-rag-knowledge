# 公开知识库维护规范

## 新增资料流程

1. 复制 `quartz-knowledge-site/content/资料模板.md`。
2. 按分类放入 `图谱条目/课程体系与核心课件`、`图谱条目/AI工具实操教程`、`图谱条目/大学规划与职业发展` 或其他已审核目录。
3. 填写标题、分类、标签、来源、更新时间、状态和公开范围。
4. 运行检查：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/validate_public_notes.ps1
```

5. 本地构建并检查页面，再提交 GitHub。

## 发布验收

- GitHub 提交成功；
- Cloudflare 构建成功；
- 首页、资料索引、图谱页面返回 200；
- 新资料能在搜索和分类页找到；
- 图谱节点数量和资料数量没有异常下降；
- 不包含密码、API Key、身份证号或未授权内部资料。

## 归档规则

过期资料不要直接删除，先将 `status` 改为 `archived`，并在正文注明替代资料或失效原因。确认没有引用后再删除。
