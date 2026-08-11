"use client";

import { useEffect, useRef, useState } from "react";
import type { PatternGeometry, Point } from "../lib/pattern-geometry";
import { patternMarks } from "../lib/pattern";

type MarkerPosition = { id: string; left: number; top: number; side: "left" | "right" };

type Props = {
  geometry: PatternGeometry;
  selectedId: string;
  onSelect: (id: string) => void;
  revision: string;
};

export default function CalculatedPatternCanvas({ geometry, selectedId, onSelect, revision }: Props) {
  const boardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [markers, setMarkers] = useState<MarkerPosition[]>([]);

  useEffect(() => {
    const board = boardRef.current;
    const canvas = canvasRef.current;
    if (!board || !canvas) return;

    const draw = () => {
      const rect = board.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 10) return;
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);

      const styles = getComputedStyle(board);
      const color = (token: string) => styles.getPropertyValue(token).trim();
      const ink = color("--ink") || "#302c29";
      const paper = color("--card") || "#fffdf9";
      const line = color("--line") || "#d8d0c6";
      const muted = color("--muted") || "#7f766e";
      const wine = color("--wine") || "#743f45";
      const sage = color("--sage") || "#71806d";
      const gold = color("--gold") || "#ba8f4e";

      const narrow = rect.width < 520;
      const pad = { left: narrow ? 58 : 128, right: narrow ? 58 : 128, top: 62, bottom: 54 };
      const scale = Math.max(5, Math.min(
        (rect.width - pad.left - pad.right) / geometry.bounds.width,
        (rect.height - pad.top - pad.bottom) / geometry.bounds.height,
      ));
      const contentWidth = geometry.bounds.width * scale;
      const originX = Math.max(pad.left, (rect.width - contentWidth) / 2);
      const originY = pad.top;
      const point = (value: Point) => ({ x: originX + value.x * scale, y: originY + value.y * scale });
      const haloText = (label: string, x: number, y: number) => {
        ctx.save();
        ctx.strokeStyle = paper;
        ctx.lineWidth = narrow ? 3.5 : 3;
        ctx.lineJoin = "round";
        ctx.strokeText(label, x, y);
        ctx.fillText(label, x, y);
        ctx.restore();
      };

      ctx.save();
      ctx.shadowColor = "rgba(45,35,25,.18)";
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 12;
      ctx.beginPath();
      geometry.outline.forEach((command) => {
        const p = point(command.point);
        if (command.kind === "move") ctx.moveTo(p.x, p.y);
        if (command.kind === "line") ctx.lineTo(p.x, p.y);
        if (command.kind === "bezier") {
          const cp1 = point(command.cp1);
          const cp2 = point(command.cp2);
          ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p.x, p.y);
        }
      });
      ctx.closePath();
      ctx.fillStyle = paper;
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      geometry.lines.forEach((geometryLine) => {
        const from = point(geometryLine.from);
        const to = point(geometryLine.to);
        const selected = selectedId === geometryLine.id;
        ctx.save();
        ctx.strokeStyle = selected ? wine : geometryLine.kind === "fold" ? ink : line;
        ctx.lineWidth = selected ? 2.3 : geometryLine.kind === "fold" ? 1.5 : 1;
        if (geometryLine.kind !== "fold") ctx.setLineDash(geometryLine.kind === "dimension" ? [5, 4] : [3, 4]);
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.fillStyle = selected ? wine : muted;
        ctx.font = "600 9px ui-sans-serif, system-ui, sans-serif";
        ctx.textBaseline = "bottom";
        const compactLabels: Record<string, string> = {
          "armhole-depth": "ARMHOLE",
          "full-bust": "BUST",
          waist: "WAIST",
          hip: "HIP",
          "dress-length": "TOP LENGTH",
        };
        const baseLabel = narrow ? compactLabels[geometryLine.id] ?? geometryLine.label : geometryLine.label;
        const compactValue = narrow ? geometryLine.value?.replace(" in", "\u2033") : geometryLine.value;
        const label = compactValue ? `${baseLabel} ${compactValue}` : baseLabel;
        if (geometryLine.id === "dress-length") {
          ctx.save();
          ctx.translate(from.x - 34, (from.y + to.y) / 2);
          ctx.rotate(-Math.PI / 2);
          haloText(label, 0, 0);
          ctx.restore();
        } else if (geometryLine.kind === "fold") {
          ctx.save();
          ctx.textAlign = "right";
          ctx.translate(from.x - 8, from.y + 35);
          ctx.rotate(-Math.PI / 2);
          haloText(narrow ? (geometry.piece === "front" ? "CENTER FRONT · FOLD" : "CENTER BACK · ZIP") : label, 0, 0);
          ctx.restore();
        } else {
          const rightWeighted = geometryLine.id === "full-bust" || geometryLine.id === "waist" || geometryLine.id === "hip";
          ctx.textAlign = rightWeighted ? "right" : "center";
          const labelX = rightWeighted ? to.x - 7 : from.x + (to.x - from.x) * 0.56;
          haloText(label, labelX, from.y - 5);
        }
        ctx.restore();

        if (geometryLine.kind === "dimension") {
          ctx.save();
          ctx.fillStyle = selected ? wine : muted;
          for (const endpoint of [from, to]) {
            ctx.beginPath();
            ctx.moveTo(endpoint.x, endpoint.y - 3);
            ctx.lineTo(endpoint.x, endpoint.y + 3);
            ctx.lineTo(endpoint.x + (endpoint === from ? 4 : -4), endpoint.y);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();
        }
      });

      geometry.darts.forEach((dart) => {
        const highlighted = selectedId === "bust-depth" || selectedId === "bust-span" || (selectedId === "waist" && dart.id.includes("waist"));
        ctx.save();
        ctx.strokeStyle = highlighted ? wine : gold;
        ctx.fillStyle = highlighted ? wine : gold;
        ctx.lineWidth = highlighted ? 2.25 : 1.35;
        ctx.beginPath();
        dart.legs.forEach((leg, index) => {
          const p = point(leg);
          if (index === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        });
        if (dart.legs.length === 4) ctx.closePath();
        ctx.stroke();
        const labelPoint = point(dart.id === "bust-dart" ? dart.legs[2] : dart.legs[Math.floor(dart.legs.length / 2)]);
        ctx.font = "600 8px ui-sans-serif, system-ui, sans-serif";
        if (dart.id === "bust-dart") {
          ctx.textAlign = "right";
          haloText(`${narrow ? "BUST DART" : dart.label} · ${narrow ? dart.value.replace(" in", "\u2033") : dart.value}`, labelPoint.x - 7, labelPoint.y + 13);
        } else {
          haloText(`${dart.label} · ${narrow ? dart.value.replace(" in", "\u2033") : dart.value}`, labelPoint.x + 6, labelPoint.y - 7);
        }
        ctx.restore();
      });

      if (geometry.apex) {
        const apex = point(geometry.apex);
        ctx.save();
        ctx.strokeStyle = selectedId === "bust-depth" || selectedId === "bust-span" ? wine : gold;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(apex.x - 5, apex.y);
        ctx.lineTo(apex.x + 5, apex.y);
        ctx.moveTo(apex.x, apex.y - 5);
        ctx.lineTo(apex.x, apex.y + 5);
        ctx.stroke();
        ctx.fillStyle = muted;
        ctx.font = "600 8px ui-sans-serif, system-ui, sans-serif";
        ctx.textAlign = "right";
        haloText("APEX", apex.x - 7, apex.y - 9);
        ctx.restore();
      }

      const drawArrowHead = (x: number, y: number, direction: "up" | "down") => {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 4, y + (direction === "up" ? 7 : -7));
        ctx.lineTo(x + 4, y + (direction === "up" ? 7 : -7));
        ctx.closePath();
        ctx.fill();
      };

      const grainFrom = point(geometry.technical.grainline.from);
      const grainTo = point(geometry.technical.grainline.to);
      ctx.save();
      ctx.strokeStyle = ink;
      ctx.fillStyle = ink;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(grainFrom.x, grainFrom.y);
      ctx.lineTo(grainTo.x, grainTo.y);
      ctx.stroke();
      drawArrowHead(grainFrom.x, grainFrom.y, "up");
      drawArrowHead(grainTo.x, grainTo.y, "down");
      ctx.translate(grainFrom.x + 10, (grainFrom.y + grainTo.y) / 2);
      ctx.rotate(Math.PI / 2);
      ctx.font = "700 8px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText("GRAINLINE", -24, 0);
      ctx.restore();

      const shortenFrom = point(geometry.technical.lengthenShorten.from);
      const shortenTo = point(geometry.technical.lengthenShorten.to);
      ctx.save();
      ctx.strokeStyle = muted;
      ctx.lineWidth = 1;
      ctx.setLineDash([7, 4]);
      ctx.beginPath();
      ctx.moveTo(shortenFrom.x, shortenFrom.y - 3);
      ctx.lineTo(shortenTo.x, shortenTo.y - 3);
      ctx.moveTo(shortenFrom.x, shortenFrom.y + 3);
      ctx.lineTo(shortenTo.x, shortenTo.y + 3);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = muted;
      ctx.font = "600 7px ui-sans-serif, system-ui, sans-serif";
      ctx.textAlign = "center";
      haloText(narrow ? "LENGTHEN / SHORTEN" : "LENGTHEN / SHORTEN HERE", (shortenFrom.x + shortenTo.x) / 2, shortenFrom.y - 7);
      ctx.restore();

      const facing = geometry.technical.facingLine;
      const facingFrom = point(facing.from);
      const facingCp1 = point(facing.cp1);
      const facingCp2 = point(facing.cp2);
      const facingTo = point(facing.to);
      ctx.save();
      ctx.strokeStyle = wine;
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(facingFrom.x, facingFrom.y);
      ctx.bezierCurveTo(facingCp1.x, facingCp1.y, facingCp2.x, facingCp2.y, facingTo.x, facingTo.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = wine;
      ctx.font = "700 7px ui-sans-serif, system-ui, sans-serif";
      ctx.textAlign = "left";
      haloText(narrow ? "FACING" : "FACING CUT LINE", facingFrom.x + 8, facingFrom.y + 14);
      ctx.restore();

      geometry.notches.forEach((notch) => {
        const notchPoint = point(notch.point);
        ctx.save();
        ctx.strokeStyle = ink;
        ctx.lineWidth = 1.3;
        for (let notchIndex = 0; notchIndex < notch.count; notchIndex += 1) {
          const offset = (notchIndex - (notch.count - 1) / 2) * 7;
          ctx.beginPath();
          if (notch.direction === "side") {
            ctx.moveTo(notchPoint.x + offset * 0.15, notchPoint.y + offset);
            ctx.lineTo(notchPoint.x - 7 + offset * 0.15, notchPoint.y - 4 + offset);
            ctx.lineTo(notchPoint.x - 7 + offset * 0.15, notchPoint.y + 4 + offset);
          } else {
            ctx.moveTo(notchPoint.x + offset, notchPoint.y);
            ctx.lineTo(notchPoint.x - 4 + offset, notchPoint.y + 7);
            ctx.lineTo(notchPoint.x + 4 + offset, notchPoint.y + 7);
          }
          ctx.stroke();
        }
        ctx.restore();
      });

      geometry.darts.forEach((dart) => {
        const punchPoints = dart.legs.length === 3 ? [dart.legs[1]] : [dart.legs[0], dart.legs[2]];
        punchPoints.forEach((punchPoint) => {
          const punch = point(punchPoint);
          ctx.save();
          ctx.fillStyle = paper;
          ctx.strokeStyle = gold;
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.arc(punch.x, punch.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        });
      });

      const pieceLabel = point(geometry.technical.labelPoint);
      ctx.save();
      const labelWidth = narrow ? 118 : 196;
      ctx.fillStyle = "rgba(255,253,249,.92)";
      ctx.strokeStyle = line;
      ctx.lineWidth = 0.8;
      ctx.fillRect(pieceLabel.x - labelWidth / 2, pieceLabel.y - 14, labelWidth, 43);
      ctx.strokeRect(pieceLabel.x - labelWidth / 2, pieceLabel.y - 14, labelWidth, 43);
      ctx.fillStyle = ink;
      ctx.textAlign = "center";
      ctx.font = "700 9px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(geometry.technical.pieceName, pieceLabel.x, pieceLabel.y);
      ctx.font = "600 7px ui-sans-serif, system-ui, sans-serif";
      ctx.fillStyle = muted;
      ctx.fillText(narrow ? geometry.technical.cutInstruction : `${geometry.technical.cutInstruction} · ${geometry.technical.seamAllowance}`, pieceLabel.x, pieceLabel.y + 12);
      ctx.fillText(`CUSTOM · ${geometry.neckline.replace("-", " ").toUpperCase()}`, pieceLabel.x, pieceLabel.y + 23);
      ctx.restore();

      if (geometry.technical.zipperStop) {
        const zip = point(geometry.technical.zipperStop);
        ctx.save();
        ctx.strokeStyle = wine;
        ctx.fillStyle = wine;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(zip.x - 5, zip.y);
        ctx.lineTo(zip.x + 5, zip.y);
        ctx.moveTo(zip.x, zip.y - 5);
        ctx.lineTo(zip.x, zip.y + 5);
        ctx.stroke();
        ctx.font = "700 7px ui-sans-serif, system-ui, sans-serif";
        ctx.fillText("ZIPPER STOP", zip.x + 8, zip.y + 3);
        ctx.restore();
      }

      if (geometry.piece === "front") {
        const foldY = originY + geometry.bounds.height * scale * 0.72;
        ctx.save();
        ctx.fillStyle = ink;
        ctx.font = "700 7px ui-sans-serif, system-ui, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText("PLACE ON FOLD", originX - 14, foldY - 5);
        ctx.beginPath();
        ctx.moveTo(originX - 12, foldY);
        ctx.lineTo(originX - 2, foldY - 5);
        ctx.lineTo(originX - 2, foldY + 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      ctx.save();
      ctx.fillStyle = geometry.fallbackIds.length ? gold : sage;
      ctx.font = "700 9px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(geometry.fallbackIds.length ? "PROVISIONAL GEOMETRY" : "MEASURED GEOMETRY", originX, 30);
      ctx.fillStyle = muted;
      ctx.font = "500 9px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(`${geometry.measuredCount} measured · ${geometry.fallbackIds.length} provisional`, originX, 45);
      ctx.restore();

      const leftIds = new Set(["bust-span", "bust-depth", "front-waist", "back-width", "back-waist", "dress-length"]);
      const markerTargets = Object.entries(geometry.marks).map(([id, value]) => ({ id, target: point(value), side: leftIds.has(id) ? "left" as const : "right" as const }));
      const distribute = (side: "left" | "right") => {
        const sideMarkers = markerTargets.filter((item) => item.side === side).sort((a, b) => a.target.y - b.target.y);
        const minTop = 72;
        const maxTop = rect.height - 72;
        const gap = 38;
        const tops: number[] = [];
        sideMarkers.forEach((item, index) => tops.push(Math.max(minTop, item.target.y - 13, index ? tops[index - 1] + gap : minTop)));
        if (tops.length && tops[tops.length - 1] > maxTop) {
          const shift = tops[tops.length - 1] - maxTop;
          for (let index = 0; index < tops.length; index += 1) tops[index] -= shift;
        }
        return sideMarkers.map((item, index) => ({ ...item, top: Math.max(minTop, tops[index]) }));
      };
      const laidOut = [...distribute("left"), ...distribute("right")];
      laidOut.forEach((marker) => {
        const buttonWidth = narrow ? 32 : 108;
        const buttonLeft = marker.side === "left" ? 8 : rect.width - buttonWidth - 8;
        const anchorX = marker.side === "left" ? buttonLeft + buttonWidth : buttonLeft;
        const anchorY = marker.top + 14;
        const elbowX = marker.side === "left" ? originX - 17 : originX + contentWidth + 17;
        ctx.save();
        ctx.strokeStyle = selectedId === marker.id ? wine : line;
        ctx.fillStyle = selectedId === marker.id ? wine : muted;
        ctx.lineWidth = selectedId === marker.id ? 1.6 : 1;
        ctx.beginPath();
        ctx.moveTo(marker.target.x, marker.target.y);
        ctx.lineTo(elbowX, marker.target.y);
        ctx.lineTo(anchorX, anchorY);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(marker.target.x, marker.target.y, selectedId === marker.id ? 3 : 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      const buttonWidth = narrow ? 32 : 108;
      setMarkers(laidOut.map((marker) => ({ id: marker.id, left: marker.side === "left" ? 8 : rect.width - buttonWidth - 8, top: marker.top, side: marker.side })));
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(board);
    return () => observer.disconnect();
  }, [geometry, selectedId]);

  const visibleMarks = patternMarks.filter((mark) => mark.pieces.includes(geometry.piece));

  return (
    <div ref={boardRef} className={`pattern-board calculated ${geometry.piece}`} role="group" aria-label={`${geometry.piece} boat-neck top pattern calculated from current measurements`}>
      <canvas ref={canvasRef} role="img" aria-label={`${geometry.piece} half-pattern with boat neckline, facing line, shoulder, armhole, bust, waist, top hem, darts, center line, and zipper markings`} />
      <span key={revision} className="geometry-recalculated" aria-live="polite">Pattern recalculated</span>
      <div className="pattern-invariant-strip" aria-label="Sewing geometry checks">
        {geometry.invariants.map((invariant) => <span key={invariant.id} className={invariant.ok ? "ok" : "warning"}>{invariant.ok ? "✓" : "!"} {invariant.label}</span>)}
      </div>
      {visibleMarks.map((mark, index) => {
        const marker = markers.find((item) => item.id === mark.id);
        if (!marker) return null;
        return (
          <button
            key={mark.id}
            className={`pattern-hotspot gutter-${marker.side} ${selectedId === mark.id ? "selected" : ""}`}
            style={{ left: marker.left, top: marker.top }}
            onClick={() => onSelect(mark.id)}
            aria-label={`${mark.title}: select measurement`}
          >
            <span>{index + 1}</span><b>{mark.shortLabel}</b>
          </button>
        );
      })}
    </div>
  );
}
