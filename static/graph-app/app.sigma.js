import Sigma from "sigma"
import Graph from "graphology"

const info = document.getElementById("info")
const graph = document.getElementById("graph")
const search = document.getElementById("search")
const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))
let query = ""
let zoomRatio = 1
let selectedNode = null
let hoveredNode = null
let focusDirectory = null

fetch("./graph-data.json").then((r) => { if (!r.ok) throw new Error("图谱数据加载失败：" + r.status); return r.json() }).then((data) => {
  const g = new Graph()
  const dirs = data.nodes.filter((n) => n.kind === "directory")
  const articles = data.nodes.filter((n) => n.kind === "article")
  const tags = data.nodes.filter((n) => n.kind === "tag")
  const dirMap = new Map(dirs.map((d) => [d.id, d]))
  g.addNode("root", { label: "小鼎的知识库", kind: "root", size: 18, color: "#f0b18e", x: 0, y: 0 })
  const children = new Map()
  dirs.forEach((d) => { if (!children.has(d.parent)) children.set(d.parent, []); children.get(d.parent).push(d) })
  const placed = new Map([["root", { x: 0, y: 0 }]])
  const placeDirs = (parent, center, radius, depth) => {
    const list = children.get(parent) || []
    list.forEach((d, i) => {
      const isRootChild = parent === "root"
      const angle = (i / Math.max(list.length, 1)) * Math.PI * 2 + depth * .7
      const x = isRootChild ? (i % 3 - 1) * 230 : center.x + Math.cos(angle) * radius
      const y = isRootChild ? (Math.floor(i / 3) - .5) * 190 : center.y + Math.sin(angle) * radius
      placed.set(d.id, { x, y })
      g.addNode(d.id, { ...d, size: depth === 0 ? 11 : 6, color: depth === 0 ? "#d97757" : "#a9688e", x, y })
      g.addEdge(d.parent, d.id, { kind: "contains", color: "#70424c", size: depth === 0 ? 1 : .45 })
      placeDirs(d.id, { x, y }, isRootChild ? 72 : Math.max(42, radius * .62), depth + 1)
    })
  }
  placeDirs("root", { x: 0, y: 0 }, 72, 0)
  const articlesByParent = new Map()
  articles.forEach((a) => { if (!articlesByParent.has(a.parent)) articlesByParent.set(a.parent, []); articlesByParent.get(a.parent).push(a) })
  articlesByParent.forEach((items, parent) => {
    const center = placed.get(parent) || { x: 0, y: 0 }
    items.forEach((a, i) => {
      const angle = (i / Math.max(items.length, 1)) * Math.PI * 2
    const radius = Math.max(28, Math.min(150, 20 + Math.sqrt(items.length) * 5.5))
      const x = center.x + Math.cos(angle) * radius
      const y = center.y + Math.sin(angle) * radius
      g.addNode(a.id, { ...a, size: 2.2, color: "#7781bd", x, y })
      g.addEdge(parent, a.id, { kind: "contains", color: "#3c2935", size: .2 })
    })
  })
  tags.forEach((t, i) => { const angle = i * 2.399; const radius = 115 + (i % 7) * 8; g.addNode(t.id, { ...t, size: 2, color: "#61c5a8", x: Math.cos(angle) * radius, y: Math.sin(angle) * radius }) })
  data.edges.filter((e) => e.kind === "link" || e.kind === "tagged").forEach((e) => { if (g.hasNode(e.source) && g.hasNode(e.target)) g.addEdge(e.source, e.target, { kind: e.kind, color: e.kind === "tagged" ? "#31534d" : "#9b718c", size: e.kind === "tagged" ? .15 : .35 }) })
  const renderer = new Sigma(g, graph, {
    renderLabels: true, labelColor: { color: "#f6eee9" }, labelRenderedSizeThreshold: 9,
    defaultNodeColor: "#7781bd", defaultEdgeColor: "#3c2935", stagePadding: 180, zIndex: true,
    nodeReducer: (node, attrs) => {
      const out = { ...attrs }
      const match = !query || attrs.label.toLowerCase().includes(query)
      let inFocus = !focusDirectory || node === focusDirectory || attrs.kind === "root"
      let parent = attrs.parent
      while (!inFocus && parent && g.hasNode(parent)) { if (parent === focusDirectory) inFocus = true; parent = g.getNodeAttribute(parent, "parent") }
      const focused = node === selectedNode || node === hoveredNode
      if (!inFocus && attrs.kind !== "tag") out.hidden = true
      if (attrs.kind === "article") out.label = focused || (query && match) ? attrs.label : ""
      if (attrs.kind === "tag") out.label = focused || (query && match) || zoomRatio > 1.25 ? attrs.label : ""
      if (query) { out.color = match ? "#f4c5aa" : "#2b2434"; out.size = match ? attrs.size * 2 : attrs.size * .7 }
      if (selectedNode && node !== selectedNode && !g.neighbors(selectedNode).includes(node)) out.color = "#241d2b"
      return out
    },
    edgeReducer: (edge, attrs) => {
      const out = { ...attrs }
      if (selectedNode) {
        const ends = g.extremities(edge)
        out.hidden = !ends.includes(selectedNode) && !g.neighbors(selectedNode).some((node) => ends.includes(node))
        if (!out.hidden) { out.color = "#d9a18e"; out.size = Math.max(attrs.size || .2, .8) }
      }
      return out
    },
  })
  renderer.getCamera().on("updated", ({ ratio }) => { zoomRatio = ratio; renderer.refresh() })
  const show = (node) => { const a = g.getNodeAttributes(node); const parent = a.parent && g.hasNode(a.parent) ? g.getNodeAttribute(a.parent, "label") : a.kind; const tagsText = Array.isArray(a.tags) && a.tags.length ? "<small>标签：" + esc(a.tags.join(" · ")) + "</small>" : ""; const link = a.kind === "article" && a.url ? "<a href=\"" + esc(a.url) + "\">打开文章 →</a>" : ""; info.innerHTML = "<strong>" + esc(a.label) + "</strong><small>" + esc(parent) + "</small>" + tagsText + "<p>" + esc(a.description || "点击节点查看关联资料。") + "</p>" + link }
  renderer.on("enterNode", ({ node }) => { hoveredNode = node; show(node); renderer.refresh() })
  renderer.on("leaveNode", () => { hoveredNode = null; renderer.refresh() })
  renderer.on("clickNode", ({ node }) => { selectedNode = node; const a = g.getNodeAttributes(node); focusDirectory = a.kind === "directory" ? node : focusDirectory; show(node); renderer.refresh() })
  renderer.on("clickStage", () => { selectedNode = null; hoveredNode = null; focusDirectory = null; info.innerHTML = "<strong>全部资料已加载</strong><p>" + data.stats.articles + " 篇文章、" + data.stats.directories + " 个目录、" + data.stats.tags + " 个标签。</p>"; renderer.refresh() })
  search.oninput = () => { query = search.value.trim().toLowerCase(); renderer.refresh(); if (query) { const match = g.nodes().find((node) => g.getNodeAttribute(node, "label").toLowerCase().includes(query)); if (match) { const a = g.getNodeAttributes(match); selectedNode = match; renderer.getCamera().animate({ x: a.x, y: a.y, ratio: .55 }, { duration: 400 }); show(match) } } }
  document.getElementById("reset").onclick = () => { query = ""; search.value = ""; selectedNode = null; hoveredNode = null; focusDirectory = null; renderer.getCamera().animatedReset({ duration: 400 }); info.innerHTML = "<strong>全部资料已加载</strong><p>" + data.stats.articles + " 篇文章、" + data.stats.directories + " 个目录、" + data.stats.tags + " 个标签。</p>"; renderer.refresh() }
  document.getElementById("node-count").textContent = data.stats.nodes
  document.getElementById("edge-count").textContent = data.stats.edges
  document.getElementById("cluster-count").textContent = data.stats.directories
  info.innerHTML = "<strong>全部资料已加载</strong><p>" + data.stats.articles + " 篇文章、" + data.stats.directories + " 个目录、" + data.stats.tags + " 个标签。</p>"
}).catch((e) => { info.innerHTML = "<strong>图谱数据加载失败</strong><p>" + esc(e.message) + "</p>" })
