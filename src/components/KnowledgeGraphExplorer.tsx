import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import * as d3 from "d3";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import LiveIndicator from "@/components/LiveIndicator";
import {
  Search, X, ChevronDown, ChevronUp, Maximize2, Minimize2,
  Loader2, Network, Link2, Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";

const CIV_COLORS: Record<string, string> = {
  AI: "#3B82F6",
  Biotech: "#10B981",
  Energy: "#F59E0B",
  Quantum: "#8B5CF6",
  Space: "#EC4899",
};

const EDGE_STYLES: Record<string, { stroke: string; dasharray: string; glow: boolean }> = {
  depends_on: { stroke: "#6B7280", dasharray: "", glow: false },
  conflicts_with: { stroke: "#EF4444", dasharray: "6,3", glow: false },
  synergizes_with: { stroke: "#10B981", dasharray: "", glow: true },
  discovered_by: { stroke: "#3B82F6", dasharray: "2,4", glow: false },
  evolves_into: { stroke: "#F59E0B", dasharray: "8,4", glow: false },
  part_of: { stroke: "#8B5CF6", dasharray: "", glow: false },
  enables: { stroke: "#06B6D4", dasharray: "", glow: false },
};

const ENTITY_TYPES = ["technology", "researcher", "organization", "concept", "event", "resource"];

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  entity_type: string;
  civilization: string | null;
  impact_score: number;
  description: string | null;
}

interface GraphEdge extends d3.SimulationLinkDatum<GraphNode> {
  id: string;
  relationship_type: string;
  strength: number;
  description: string | null;
  source: string | GraphNode;
  target: string | GraphNode;
}

export default function KnowledgeGraphExplorer() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<d3.Simulation<GraphNode, GraphEdge> | null>(null);

  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  // Filters
  const [civFilter, setCivFilter] = useState<string>("all");
  const [typeFilters, setTypeFilters] = useState<Set<string>>(new Set(ENTITY_TYPES));
  const [minImpact, setMinImpact] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  // Selection
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [connectedDiscoveries, setConnectedDiscoveries] = useState<any[]>([]);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Fetch data
  const fetchGraph = useCallback(async () => {
    setLoading(true);
    const [entRes, relRes] = await Promise.all([
      supabase.from("knowledge_entities").select("id, name, entity_type, civilization, impact_score, description").order("impact_score", { ascending: false }),
      supabase.from("knowledge_relationships").select("id, source_entity_id, target_entity_id, relationship_type, strength, description"),
    ]);

    const rawNodes: GraphNode[] = (entRes.data ?? []).map((e: any) => ({
      id: e.id, name: e.name, entity_type: e.entity_type,
      civilization: e.civilization, impact_score: e.impact_score ?? 0,
      description: e.description,
    }));

    const nodeIds = new Set(rawNodes.map(n => n.id));
    const rawEdges: GraphEdge[] = (relRes.data ?? [])
      .filter((r: any) => nodeIds.has(r.source_entity_id) && nodeIds.has(r.target_entity_id))
      .map((r: any) => ({
        id: r.id, source: r.source_entity_id, target: r.target_entity_id,
        relationship_type: r.relationship_type, strength: r.strength ?? 0.5,
        description: r.description,
      }));

    setNodes(rawNodes);
    setEdges(rawEdges);
    setLoading(false);
  }, []);

  useEffect(() => { fetchGraph(); }, [fetchGraph]);

  // Realtime
  useRealtimeSubscription({ table: "knowledge_entities", event: "INSERT", onInsert: () => fetchGraph() });
  useRealtimeSubscription({ table: "knowledge_relationships", event: "INSERT", onInsert: () => fetchGraph() });

  // Filter
  const filtered = useMemo(() => {
    const filteredNodes = nodes.filter(n => {
      if (civFilter !== "all" && n.civilization !== civFilter) return false;
      if (!typeFilters.has(n.entity_type)) return false;
      if (n.impact_score < minImpact) return false;
      if (searchTerm && !n.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = edges.filter(e => {
      const sid = typeof e.source === "string" ? e.source : e.source.id;
      const tid = typeof e.target === "string" ? e.target : e.target.id;
      return nodeIds.has(sid) && nodeIds.has(tid);
    });
    return { nodes: filteredNodes, edges: filteredEdges };
  }, [nodes, edges, civFilter, typeFilters, minImpact, searchTerm]);

  // Fetch connected discoveries on node select
  useEffect(() => {
    if (!selectedNode) { setConnectedDiscoveries([]); return; }
    supabase.from("discovery_entity_links").select("discovery_id")
      .eq("entity_id", selectedNode.id).limit(10)
      .then(async ({ data }) => {
        if (!data?.length) { setConnectedDiscoveries([]); return; }
        const ids = data.map(d => d.discovery_id);
        const { data: discs } = await supabase.from("discoveries")
          .select("id, title, domain, impact_score").in("id", ids);
        setConnectedDiscoveries(discs ?? []);
      });
  }, [selectedNode]);

  // D3 Simulation
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !expanded) return;

    const svg = d3.select(svgRef.current);
    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = fullscreen ? window.innerHeight - 60 : 600;

    svg.attr("width", width).attr("height", height);
    svg.selectAll("*").remove();

    if (filtered.nodes.length === 0) return;

    const defs = svg.append("defs");
    // Glow filter
    const filter = defs.append("filter").attr("id", "glow");
    filter.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "blur");
    const merge = filter.append("feMerge");
    merge.append("feMergeNode").attr("in", "blur");
    merge.append("feMergeNode").attr("in", "SourceGraphic");

    const g = svg.append("g");

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 5])
      .on("zoom", (event) => g.attr("transform", event.transform));
    svg.call(zoom);

    // Deep copy nodes/edges for d3 mutation
    const simNodes: GraphNode[] = filtered.nodes.map(n => ({ ...n }));
    const simEdges: GraphEdge[] = filtered.edges.map(e => ({
      ...e,
      source: typeof e.source === "string" ? e.source : e.source.id,
      target: typeof e.target === "string" ? e.target : e.target.id,
    }));

    const radiusScale = d3.scaleSqrt().domain([0, 1]).range([6, 28]);

    const sim = d3.forceSimulation(simNodes)
      .force("link", d3.forceLink<GraphNode, GraphEdge>(simEdges).id(d => d.id).distance(d => 120 * (1 - (d as GraphEdge).strength + 0.3)))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide<GraphNode>().radius(d => radiusScale(d.impact_score) + 4));

    simRef.current = sim;

    // Edges
    const link = g.append("g").selectAll<SVGLineElement, GraphEdge>("line")
      .data(simEdges).join("line")
      .attr("stroke", d => EDGE_STYLES[d.relationship_type]?.stroke ?? "#555")
      .attr("stroke-width", d => 1 + d.strength * 2)
      .attr("stroke-dasharray", d => EDGE_STYLES[d.relationship_type]?.dasharray ?? "")
      .attr("stroke-opacity", 0.5)
      .attr("filter", d => EDGE_STYLES[d.relationship_type]?.glow ? "url(#glow)" : "")
      .style("cursor", "pointer")
      .on("click", (_e, d) => {
        setSelectedEdge(d);
        setSelectedNode(null);
      });

    // Nodes
    const node = g.append("g").selectAll<SVGCircleElement, GraphNode>("circle")
      .data(simNodes).join("circle")
      .attr("r", d => radiusScale(d.impact_score))
      .attr("fill", d => CIV_COLORS[d.civilization ?? ""] ?? "#6B7280")
      .attr("stroke", d => d3.color(CIV_COLORS[d.civilization ?? ""] ?? "#6B7280")?.brighter(1)?.toString() ?? "#fff")
      .attr("stroke-width", 1.5)
      .attr("opacity", 0.9)
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        setHoveredNode(d);
        const [x, y] = d3.pointer(event, svg.node());
        setTooltipPos({ x, y: y - 10 });
        d3.select(this).transition().duration(150).attr("r", radiusScale(d.impact_score) * 1.3).attr("opacity", 1);
      })
      .on("mouseout", function (_e, d) {
        setHoveredNode(null);
        d3.select(this).transition().duration(150).attr("r", radiusScale(d.impact_score)).attr("opacity", 0.9);
      })
      .on("click", (_e, d) => {
        setSelectedNode(d);
        setSelectedEdge(null);
        // Highlight connected
        const connected = new Set<string>();
        connected.add(d.id);
        simEdges.forEach(e => {
          const sid = typeof e.source === "object" ? e.source.id : e.source;
          const tid = typeof e.target === "object" ? e.target.id : e.target;
          if (sid === d.id) connected.add(tid as string);
          if (tid === d.id) connected.add(sid as string);
        });
        node.transition().duration(200).attr("opacity", n => connected.has(n.id) ? 1 : 0.15);
        link.transition().duration(200).attr("stroke-opacity", e => {
          const sid = typeof e.source === "object" ? e.source.id : e.source;
          const tid = typeof e.target === "object" ? e.target.id : e.target;
          return sid === d.id || tid === d.id ? 0.8 : 0.05;
        });
      });

    // Labels for high-impact nodes
    const labels = g.append("g").selectAll<SVGTextElement, GraphNode>("text")
      .data(simNodes.filter(n => n.impact_score >= 0.85))
      .join("text")
      .text(d => d.name.length > 18 ? d.name.slice(0, 16) + "…" : d.name)
      .attr("text-anchor", "middle")
      .attr("dy", d => radiusScale(d.impact_score) + 14)
      .attr("fill", "#ccc")
      .attr("font-size", "9px")
      .attr("pointer-events", "none");

    // Drag
    const drag = d3.drag<SVGCircleElement, GraphNode>()
      .on("start", (event, d) => {
        if (!event.active) sim.alphaTarget(0.3).restart();
        d.fx = d.x; d.fy = d.y;
      })
      .on("drag", (_event, d) => { d.fx = _event.x; d.fy = _event.y; })
      .on("end", (event, d) => {
        if (!event.active) sim.alphaTarget(0);
        d.fx = null; d.fy = null;
      });
    node.call(drag);

    sim.on("tick", () => {
      link
        .attr("x1", d => (d.source as GraphNode).x ?? 0)
        .attr("y1", d => (d.source as GraphNode).y ?? 0)
        .attr("x2", d => (d.target as GraphNode).x ?? 0)
        .attr("y2", d => (d.target as GraphNode).y ?? 0);
      node.attr("cx", d => d.x ?? 0).attr("cy", d => d.y ?? 0);
      labels.attr("x", d => d.x ?? 0).attr("y", d => d.y ?? 0);
    });

    // Reset highlight on background click
    svg.on("click", (event) => {
      if (event.target === svgRef.current) {
        setSelectedNode(null);
        setSelectedEdge(null);
        node.transition().duration(200).attr("opacity", 0.9);
        link.transition().duration(200).attr("stroke-opacity", 0.5);
      }
    });

    // Center on searched node
    if (searchTerm) {
      const found = simNodes.find(n => n.name.toLowerCase().includes(searchTerm.toLowerCase()));
      if (found && found.x != null && found.y != null) {
        setTimeout(() => {
          const t = d3.zoomIdentity.translate(width / 2 - found.x! * 1.5, height / 2 - found.y! * 1.5).scale(1.5);
          svg.transition().duration(700).call(zoom.transform, t);
        }, 800);
      }
    }

    return () => { sim.stop(); };
  }, [filtered, expanded, fullscreen]);

  const toggleType = (t: string) => {
    setTypeFilters(prev => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });
  };

  const connectedNodes = useMemo(() => {
    if (!selectedNode) return [];
    const result: { node: GraphNode; relType: string; direction: string }[] = [];
    edges.forEach(e => {
      const sid = typeof e.source === "string" ? e.source : e.source.id;
      const tid = typeof e.target === "string" ? e.target : e.target.id;
      if (sid === selectedNode.id) {
        const target = nodes.find(n => n.id === tid);
        if (target) result.push({ node: target, relType: e.relationship_type, direction: "→" });
      }
      if (tid === selectedNode.id) {
        const source = nodes.find(n => n.id === sid);
        if (source) result.push({ node: source, relType: e.relationship_type, direction: "←" });
      }
    });
    return result;
  }, [selectedNode, edges, nodes]);

  return (
    <div className={`glass-card rounded-xl border border-border/50 overflow-hidden transition-all ${fullscreen ? "fixed inset-0 z-50 rounded-none" : ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-muted/20">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-primary" />
          <h2 className="font-display font-bold text-sm">Knowledge Graph</h2>
          <LiveIndicator />
          <span className="text-[10px] text-muted-foreground ml-2">
            {filtered.nodes.length} nodes · {filtered.edges.length} edges
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setFullscreen(f => !f)}>
            {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setExpanded(e => !e)}>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {expanded && (
        <>
          {/* Filters */}
          <div className="px-4 py-3 border-b border-border/20 flex flex-wrap items-center gap-3 bg-muted/10">
            <div className="relative w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search entities…" className="h-8 pl-8 text-xs bg-muted/30"
              />
            </div>

            <Select value={civFilter} onValueChange={setCivFilter}>
              <SelectTrigger className="w-36 h-8 text-xs bg-muted/30">
                <SelectValue placeholder="Civilization" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Civilizations</SelectItem>
                {Object.keys(CIV_COLORS).map(c => (
                  <SelectItem key={c} value={c}>
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CIV_COLORS[c] }} />
                      {c}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 flex-wrap">
              {ENTITY_TYPES.map(t => (
                <label key={t} className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer">
                  <Checkbox
                    checked={typeFilters.has(t)}
                    onCheckedChange={() => toggleType(t)}
                    className="w-3.5 h-3.5"
                  />
                  {t}
                </label>
              ))}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">Impact ≥ {minImpact.toFixed(1)}</span>
              <Slider
                value={[minImpact]} min={0} max={0.95} step={0.05}
                onValueChange={v => setMinImpact(v[0])}
                className="w-24"
              />
            </div>
          </div>

          {/* Graph + Side Panel */}
          <div className="flex relative" style={{ height: fullscreen ? "calc(100vh - 120px)" : "600px" }}>
            {/* Graph Canvas */}
            <div ref={containerRef} className="flex-1 relative bg-black/20">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : filtered.nodes.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                  <Network className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-sm">No entities match filters</p>
                </div>
              ) : (
                <svg ref={svgRef} className="w-full h-full" />
              )}

              {/* Tooltip */}
              {hoveredNode && (
                <div
                  className="absolute pointer-events-none z-20 glass-card rounded-lg p-3 border border-border/50 max-w-[220px] text-xs"
                  style={{ left: tooltipPos.x + 12, top: tooltipPos.y - 60 }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: CIV_COLORS[hoveredNode.civilization ?? ""] ?? "#6B7280" }} />
                    <span className="font-display font-bold text-foreground truncate">{hoveredNode.name}</span>
                  </div>
                  <div className="flex gap-2 mb-1">
                    <Badge variant="outline" className="text-[9px] capitalize">{hoveredNode.entity_type}</Badge>
                    {hoveredNode.civilization && <Badge variant="outline" className="text-[9px]">{hoveredNode.civilization}</Badge>}
                  </div>
                  {hoveredNode.description && (
                    <p className="text-muted-foreground line-clamp-2 mt-1">{hoveredNode.description}</p>
                  )}
                  <p className="text-primary font-mono mt-1">Impact: {hoveredNode.impact_score.toFixed(2)}</p>
                </div>
              )}
            </div>

            {/* Side Panel */}
            {(selectedNode || selectedEdge) && (
              <div className="w-72 border-l border-border/30 bg-muted/10 overflow-y-auto p-4 shrink-0">
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 float-right" onClick={() => { setSelectedNode(null); setSelectedEdge(null); }}>
                  <X className="w-4 h-4" />
                </Button>

                {selectedNode && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: CIV_COLORS[selectedNode.civilization ?? ""] ?? "#6B7280" }} />
                      <h3 className="font-display font-bold text-sm">{selectedNode.name}</h3>
                    </div>

                    <div className="flex gap-1.5 mb-3 flex-wrap">
                      <Badge variant="outline" className="text-[9px] capitalize">{selectedNode.entity_type}</Badge>
                      {selectedNode.civilization && <Badge variant="outline" className="text-[9px]">{selectedNode.civilization}</Badge>}
                      <Badge variant="outline" className="text-[9px] text-primary">Impact: {selectedNode.impact_score.toFixed(2)}</Badge>
                    </div>

                    {selectedNode.description && (
                      <p className="text-xs text-muted-foreground mb-4">{selectedNode.description}</p>
                    )}

                    {connectedNodes.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-[10px] font-display font-bold text-muted-foreground uppercase tracking-wider mb-2">
                          Connected Entities ({connectedNodes.length})
                        </h4>
                        <div className="space-y-1.5">
                          {connectedNodes.map((cn, i) => (
                            <button
                              key={i}
                              className="w-full flex items-center gap-2 text-left p-1.5 rounded hover:bg-muted/30 transition-colors"
                              onClick={() => setSelectedNode(cn.node)}
                            >
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CIV_COLORS[cn.node.civilization ?? ""] ?? "#6B7280" }} />
                              <span className="text-[11px] truncate flex-1">{cn.node.name}</span>
                              <Badge variant="outline" className="text-[8px] shrink-0">{cn.direction} {cn.relType.replace(/_/g, " ")}</Badge>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {connectedDiscoveries.length > 0 && (
                      <div>
                        <h4 className="text-[10px] font-display font-bold text-muted-foreground uppercase tracking-wider mb-2">
                          Related Discoveries
                        </h4>
                        <div className="space-y-1.5">
                          {connectedDiscoveries.map((d: any) => (
                            <Link
                              key={d.id}
                              to={`/discoveries/${d.id}`}
                              className="flex items-start gap-2 p-1.5 rounded hover:bg-muted/30 transition-colors"
                            >
                              <Sparkles className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <p className="text-[11px] font-medium truncate">{d.title}</p>
                                <div className="flex gap-1 mt-0.5">
                                  <Badge variant="outline" className="text-[8px]">{d.domain}</Badge>
                                  <span className="text-[8px] text-primary font-mono">{(d.impact_score ?? 0).toFixed(1)}</span>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selectedEdge && (
                  <div>
                    <h3 className="font-display font-bold text-sm mb-3 flex items-center gap-2">
                      <Link2 className="w-4 h-4 text-primary" />
                      Relationship
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Type: </span>
                        <Badge variant="outline" className="text-[9px] capitalize">
                          {selectedEdge.relationship_type.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Strength: </span>
                        <span className="font-mono text-primary">{selectedEdge.strength.toFixed(2)}</span>
                      </div>
                      {selectedEdge.description && (
                        <div>
                          <span className="text-muted-foreground">Description: </span>
                          <p className="text-foreground mt-1">{selectedEdge.description}</p>
                        </div>
                      )}
                      <div className="border-t border-border/20 pt-2 mt-3 space-y-1">
                        {[
                          { label: "Source", node: typeof selectedEdge.source === "object" ? selectedEdge.source as GraphNode : nodes.find(n => n.id === selectedEdge.source) },
                          { label: "Target", node: typeof selectedEdge.target === "object" ? selectedEdge.target as GraphNode : nodes.find(n => n.id === selectedEdge.target) },
                        ].map(({ label, node: n }) => n && (
                          <button
                            key={label}
                            className="w-full flex items-center gap-2 text-left p-1.5 rounded hover:bg-muted/30 transition-colors"
                            onClick={() => { setSelectedNode(n); setSelectedEdge(null); }}
                          >
                            <span className="text-[9px] text-muted-foreground w-10 shrink-0">{label}</span>
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CIV_COLORS[n.civilization ?? ""] ?? "#6B7280" }} />
                            <span className="text-[11px] truncate">{n.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="px-4 py-2 border-t border-border/20 flex flex-wrap items-center gap-4 text-[9px] text-muted-foreground bg-muted/10">
            <span className="font-display font-bold uppercase tracking-wider">Nodes:</span>
            {Object.entries(CIV_COLORS).map(([c, color]) => (
              <span key={c} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                {c}
              </span>
            ))}
            <span className="mx-2">|</span>
            <span className="font-display font-bold uppercase tracking-wider">Edges:</span>
            {Object.entries(EDGE_STYLES).slice(0, 4).map(([type, style]) => (
              <span key={type} className="flex items-center gap-1">
                <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke={style.stroke} strokeWidth="2" strokeDasharray={style.dasharray} /></svg>
                {type.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
