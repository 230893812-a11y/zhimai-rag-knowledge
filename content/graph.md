---
title: 全屏知识图谱
---

# 全屏知识图谱

<div class="zhimai-graph-launch">
  <p>正在准备全库知识网络……</p>
  <p><button type="button" class="zhimai-open-graph" aria-label="打开全屏知识图谱" onclick="window.openZhimaiGraph?.()">打开全屏图谱 →</button></p>
  <p class="zhimai-graph-hint">可拖动节点、滚轮缩放；点击节点查看资料。按 Esc 返回。</p>
  <p><a href="../">← 返回知识库首页</a></p>
</div>

<script>
window.openZhimaiGraph = () => {
  const button = document.querySelector(".graph-outer .global-graph-icon, .global-graph-icon:not(.zhimai-open-graph)")
  if (button) button.click()
}
window.addEventListener("load", () => {
  let tries = 0
  const timer = setInterval(() => {
    window.openZhimaiGraph()
    if (++tries >= 20) clearInterval(timer)
  }, 500)
})
</script>
