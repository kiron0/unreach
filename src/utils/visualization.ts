import * as fs from "fs";
import * as path from "path";
import type { DependencyGraph } from "../lib/graph.js";

export function generateDependencyGraph(
  graph: DependencyGraph,
  outputPath: string,
  cwd: string,
): void {
  const nodes = graph.getNodes();
  const nodesData: Array<{
    id: string;
    label: string;
    group: number;
    title: string;
    value: number;
  }> = [];
  const edgesData: Array<{
    from: string;
    to: string;
    arrows: string;
    color: { color: string };
    title: string;
  }> = [];

  const fileToId = new Map<string, string>();
  let nodeId = 0;

  for (const [filePath, node] of nodes) {
    const relativePath = path.relative(cwd, filePath);
    const id = `node_${nodeId++}`;
    fileToId.set(filePath, id);

    const isEntryPoint = node.isEntryPoint;
    const importCount = node.imports.length;
    const exportCount = node.exports.size;
    const functionCount = node.functions.size;

    nodesData.push({
      id,
      label: path.basename(relativePath) || relativePath,
      group: isEntryPoint ? 1 : 0,
      title: `${relativePath}\nImports: ${importCount}\nExports: ${exportCount}\nFunctions: ${functionCount}`,
      value: importCount + exportCount + functionCount + 1,
    });
  }

  for (const [filePath, node] of nodes) {
    const fromId = fileToId.get(filePath);
    if (!fromId) continue;

    for (const importPath of node.imports) {
      if (importPath.startsWith(".")) {
        const resolved = graph.resolveImport(importPath, filePath);
        if (resolved) {
          const toId = fileToId.get(resolved);
          if (toId && fromId !== toId) {
            edgesData.push({
              from: fromId,
              to: toId,
              arrows: "to",
              color: { color: "#848484" },
              title: `import "${importPath}"`,
            });
          }
        }
      }
    }

    for (const dynImport of node.dynamicImports) {
      if (dynImport.path.startsWith(".")) {
        const resolved = graph.resolveImport(dynImport.path, filePath);
        if (resolved) {
          const toId = fileToId.get(resolved);
          if (toId && fromId !== toId) {
            edgesData.push({
              from: fromId,
              to: toId,
              arrows: "to",
              color: { color: "#ff9800" },
              title: `dynamic import("${dynImport.path}")`,
            });
          }
        }
      }
    }
  }

  const html = generateHTML(nodesData, edgesData);
  fs.writeFileSync(outputPath, html, "utf-8");
}

function generateHTML(
  nodes: Array<{
    id: string;
    label: string;
    group: number;
    title: string;
    value: number;
  }>,
  edges: Array<{
    from: string;
    to: string;
    arrows: string;
    color: { color: string };
    title: string;
  }>,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dependency Graph - Unreach</title>
  <script type="text/javascript" src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #1e1e1e;
      color: #d4d4d4;
    }
    #header {
      margin-bottom: 20px;
    }
    h1 {
      margin: 0 0 10px 0;
      color: #4ec9b0;
    }
    #info {
      color: #858585;
      font-size: 14px;
    }
    #network {
      width: 100%;
      height: calc(100vh - 150px);
      border: 1px solid #3e3e3e;
      border-radius: 4px;
      background: #252526;
    }
    #legend {
      margin-top: 20px;
      padding: 15px;
      background: #252526;
      border-radius: 4px;
      border: 1px solid #3e3e3e;
    }
    .legend-item {
      display: inline-block;
      margin-right: 20px;
      margin-bottom: 10px;
    }
    .legend-color {
      display: inline-block;
      width: 20px;
      height: 20px;
      border-radius: 3px;
      margin-right: 8px;
      vertical-align: middle;
    }
    .legend-entry { background: #4ec9b0; }
    .legend-regular { background: #848484; }
    .legend-dynamic { background: #ff9800; }
  </style>
</head>
<body>
  <div id="header">
    <h1>📊 Dependency Graph Visualization</h1>
    <div id="info">
      Nodes: ${nodes.length} | Edges: ${edges.length} |
      Entry Points: ${nodes.filter((n) => n.group === 1).length}
    </div>
  </div>
  <div id="network"></div>
  <div id="legend">
    <div class="legend-item">
      <span class="legend-color legend-entry"></span>
      <span>Entry Points</span>
    </div>
    <div class="legend-item">
      <span class="legend-color legend-regular"></span>
      <span>Regular Imports</span>
    </div>
    <div class="legend-item">
      <span class="legend-color legend-dynamic"></span>
      <span>Dynamic Imports</span>
    </div>
  </div>

  <script type="text/javascript">
    const nodes = new vis.DataSet(${JSON.stringify(nodes)});
    const edges = new vis.DataSet(${JSON.stringify(edges)});

    const data = {
      nodes: nodes,
      edges: edges
    };

    const options = {
      nodes: {
        shape: 'dot',
        size: 16,
        font: {
          size: 14,
          color: '#d4d4d4'
        },
        borderWidth: 2,
        shadow: true,
        color: {
          border: '#3e3e3e',
          background: '#4ec9b0',
          highlight: {
            border: '#4ec9b0',
            background: '#6ec9b0'
          }
        }
      },
      edges: {
        width: 2,
        shadow: true,
        smooth: {
          type: 'continuous',
          roundness: 0.5
        }
      },
      groups: {
        0: {
          color: {
            background: '#4ec9b0',
            border: '#3e3e3e'
          }
        },
        1: {
          color: {
            background: '#ce9178',
            border: '#3e3e3e'
          }
        }
      },
      physics: {
        enabled: true,
        stabilization: {
          enabled: true,
          iterations: 200
        },
        barnesHut: {
          gravitationalConstant: -2000,
          centralGravity: 0.1,
          springLength: 200,
          springConstant: 0.04,
          damping: 0.09
        }
      },
      interaction: {
        hover: true,
        tooltipDelay: 100,
        zoomView: true,
        dragView: true
      }
    };

    const container = document.getElementById('network');
    const network = new vis.Network(container, data, options);

    network.on('click', function(params) {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const node = nodes.get(nodeId);
        if (node) {
          console.log('Selected node:', node.title);
        }
      }
    });
  </script>
</body>
</html>`;
}
