const info = document.getElementById("info")

function esc(value) {
  return String(value ?? "").replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;" })[char])
}

fetch("../contentIndex.json")
  .then((response) => response.json())
  .then((index) => {
    const pages = Object.values(index).filter((page) => page.slug && page.slug !== "index" && !page.slug.startsWith("tags/") && page.slug !== "graph")
    const root = { id: "root", label: "知脉 RAG 知识库", kind: "root", category: "全部" }
    const categories = new Map()
    const nodes = [root]
    const edges = []

    for (const page of pages) {
      const parts = page.slug.split("/")
      const category = parts[0] === "图谱条目" ? (parts[1] || "其他资料") : "站点说明"
      const categoryId = `cat-${category}`
      if (!categories.has(categoryId)) {
        categories.set(categoryId, category)
        nodes.push({ id: categoryId, label: category, kind: "category", category })
        edges.push({ id: `root-${categoryId}`, source: "root", target: categoryId })
      }
      const id = `doc-${nodes.length}`
      nodes.push({ id, label: page.title || page.slug, kind: "document", category, url: page.slug, description: page.content?.replace(/\s+/g, " ").slice(0, 120) })
      edges.push({ id: `edge-${id}`, source: categoryId, target: id })
    }

    const cy = cytoscape({
      container: document.getElementById("graph"),
      elements: [...nodes.map((data) => ({ data })), ...edges.map((data) => ({ data }))],
      style: [
        { selector: "node", style: { label: "data(label)", color: "#c7c9e8", "font-size": 9, "text-outline-color": "#050508", "text-outline-width": 2, "text-max-width": 130, "text-wrap": "wrap", "background-color": "#69708f", width: 10, height: 10, "border-width": 2, "border-color": "#9da7d2", "shadow-blur": 10, "shadow-color": "#7f8cc7", "shadow-opacity": 0.55, "transition-property": "width height background-color border-width shadow-blur opacity", "transition-duration": "220ms" } },
        { selector: 'node[kind = "root"]', style: { "background-color": "#9b7bff", width: 34, height: 34, "border-color": "#d0c4ff", "shadow-blur": 28, "shadow-color": "#9b7bff", "font-size": 15, color: "#fff" } },
        { selector: 'node[kind = "category"]', style: { "background-color": "#ff6680", width: 22, height: 22, "border-color": "#ffb4c0", "shadow-color": "#ff6680", "font-size": 12, color: "#fff" } },
        { selector: "node.focused", style: { width: 34, height: 34, "border-width": 4, "border-color": "#fff", "shadow-blur": 32, "shadow-opacity": 1, opacity: 1, "font-size": 12 } },
        { selector: "node.dimmed", style: { opacity: 0.1 } },
        { selector: "edge", style: { "line-color": "#303750", width: 0.7, opacity: 0.65, "curve-style": "bezier" } },
        { selector: "edge.dimmed", style: { opacity: 0.05 } },
      ],
      layout: { name: "cose", animate: false, padding: 140, idealEdgeLength: 90, nodeRepulsion: 12000, gravity: 0.25 },
    })

    const categorySelect = document.getElementById("category")
    ;["全部", ...categories.values()].forEach((category) => categorySelect.add(new Option(category, category)))

    function showNode(node) {
      const data = node.data()
      if (data.kind === "document") {
        info.innerHTML = `<strong>${esc(data.label)}</strong><small>${esc(data.category)}</small><p>${esc(data.description || "暂无摘要")}</p><a href="../../${encodeURI(data.url)}">打开资料 →</a>`
      } else {
        info.innerHTML = `<strong>${esc(data.label)}</strong><small>${data.kind === "root" ? "知识库中心" : "分类节点"}</small><p>点击节点查看关联资料，使用上方筛选器聚焦某个主题。</p>`
      }
    }

    function applyFilter() {
      const query = document.getElementById("search").value.trim().toLowerCase()
      const category = categorySelect.value
      cy.nodes().forEach((node) => {
        const data = node.data()
        const visible = (category === "全部" || data.category === category || data.kind === "root") && (!query || data.label.toLowerCase().includes(query))
        node.toggleClass("dimmed", !visible)
      })
      cy.edges().forEach((edge) => edge.toggleClass("dimmed", edge.source().hasClass("dimmed") || edge.target().hasClass("dimmed")))
      const match = cy.nodes().filter((node) => !node.hasClass("dimmed") && node.data("kind") === "document").first()
      if (query && match.length) { cy.animate({ fit: { eles: match.union(match.neighborhood()), padding: 100 } }, { duration: 350 }); match.addClass("focused"); setTimeout(() => match.removeClass("focused"), 900) }
    }

    cy.on("mouseover", "node", (event) => { showNode(event.target); event.target.addClass("focused") })
    cy.on("mouseout", "node", (event) => event.target.removeClass("focused"))
    cy.on("tap", "node", (event) => showNode(event.target))
    document.getElementById("reset").onclick = () => { categorySelect.value = "全部"; document.getElementById("search").value = ""; cy.nodes().removeClass("dimmed focused"); cy.edges().removeClass("dimmed"); cy.fit(undefined, 80); info.textContent = "点击节点查看资料" }
    document.getElementById("search").oninput = applyFilter
    categorySelect.onchange = applyFilter
  })
  .catch(() => { info.textContent = "图谱数据加载失败，请刷新页面" })
