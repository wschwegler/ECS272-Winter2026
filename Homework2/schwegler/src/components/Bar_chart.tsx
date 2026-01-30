import React from 'react'
import { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import { isEmpty } from 'lodash';
import { useResizeObserver, useDebounceCallback } from 'usehooks-ts';

import { Bar, ComponentSize, Margin } from '../types';

interface CategoricalBar extends Bar {
  category: string;
}

export default function Bar_chart() {
  const [bars, setBars] = useState<CategoricalBar[]>([]);
  const barRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 });

  const base = Math.min(size.width, size.height);
    const margin: Margin = {
      top:    Math.max(50, base * 0.12),
      right:  Math.max(60, base * 0.35),
      bottom: Math.max(80, base * 0.30),
      left:   Math.max(80, base * 0.35)
    };

  const onResize = useDebounceCallback(
    (size: ComponentSize) => setSize(size),
    200
  );

  useResizeObserver({
    ref: barRef as React.RefObject<HTMLDivElement>,
    onResize
  });

  useEffect(() => {
    const loadCSV = async () => {
      const raw = await d3.csv(
        '../../data/top_1000_most_swapped_books.csv',
        d3.autoType
      );

      const count: Record<string, number> = {};

      for (const row of raw as any[]) {
        if (!row.genre) continue;

        for (const g of row.genre.split(',')) {
          const genre = g.trim();
          if (!genre) continue;
          count[genre] = (count[genre] || 0) + 1;
        }
      }

      const genreData: CategoricalBar[] = Object.entries(count)
        .map(([category, value]) => ({
          category,
          value
        }))
        .sort((a, b) => d3.descending(a.value, b.value))
        .slice(0, 5); 

      setBars(genreData);
    };

    loadCSV();
  }, []);

  useEffect(() => {
    if (isEmpty(bars)) return;
    if (size.width === 0 || size.height === 0) return;

    d3.select('#bar-svg').selectAll('*').remove();
    initChart();
  }, [bars, size]);

  function initChart() {
  const svg = d3.select('#bar-svg');

  svg.append('rect')
    .attr('width', size.width)
    .attr('height', size.height)
    .attr('fill', '#e4e3e3ff')
    .attr("rx", 8)
    .attr("ry", 8);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`)
    .style("font-family", "sans-serif");

  const innerWidth = size.width - margin.left - margin.right;
  const innerHeight = size.height - margin.top - margin.bottom;

  const base = Math.min(innerWidth, innerHeight);

  const axisFont = Math.max(12, base * 0.045);
  const labelFont = Math.max(14, base * 0.055);
  const titleFont = Math.max(18, base * 0.075);

  const xCategories = bars.map(d => d.category);
  const maxVal = d3.max(bars, d => d.value)!;

  const xScale = d3.scaleBand()
    .domain(xCategories)
    .range([0, innerWidth])
    .padding(0.15);

  const yScale = d3.scaleLinear()
    .domain([0, maxVal])
    .nice()
    .range([innerHeight, 0]);

  const genreColors: Record<string, string> = {
    "Fantasy": "#22c4c9",
    "Sci-Fi": "#22c938",
    "Historical Fiction": "#e69d2c",
    "Fiction": "#c122c9",
    "Thriller": "#c92225"
  };

  g.selectAll("rect")
    .data(bars)
    .join("rect")
    .attr("x", d => xScale(d.category)!)
    .attr("y", d => yScale(d.value))
    .attr("width", xScale.bandwidth())
    .attr("height", d => innerHeight - yScale(d.value))
    .attr("fill", d => genreColors[d.category] || "#999")
    .attr("rx", 5)
    .attr("ry", 5)
    .attr("opacity", 0.45);

  const xAxis = g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(xScale));

  xAxis.selectAll("text")
    .style("font-size", `${axisFont}px`)
    .style("fill", "#0d0d0dff");

  const yAxis = g.append("g")
    .call(d3.axisLeft(yScale));

  yAxis.selectAll("text")
    .style("font-size", `${axisFont}px`)
    .style("fill", "#333");

  g.append("text")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + labelFont * 2.5)
    .attr("text-anchor", "middle")
    .style("font-size", `${labelFont}px`)
    .style("font-weight", "600")
    .style("fill", "#111")
    .text("Genre");

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -labelFont * 2.5)
    .attr("text-anchor", "middle")
    .style("font-size", `${labelFont}px`)
    .style("font-weight", "600")
    .style("fill", "#111")
    .text("Number of Books");

  g.append("text")
    .attr("x", 0)
    .attr("y", -titleFont * 0.6)
    .attr("font-size", `${titleFont}px`)
    .attr("font-weight", "bold")
    .text("Top 5 Book Genres by Count");
}

  return (
    <div ref={barRef} className="chart-container">
      <svg id="bar-svg" width="100%" height="100%" />
    </div>
  );
}
