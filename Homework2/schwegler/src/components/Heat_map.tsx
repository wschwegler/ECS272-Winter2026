import React from 'react';
import { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import { isEmpty } from 'lodash';
import { useResizeObserver, useDebounceCallback } from 'usehooks-ts';

import { ComponentSize, Margin } from '../types';

interface HeatCell {
  genre: string;
  age: string;
  rating: number;
}

export default function HeatmapChart() {
  const [cells, setCells] = useState<HeatCell[]>([]);
  const [allCells, setAllCells] = useState<HeatCell[]>([]); 
  const containerRef = useRef<HTMLDivElement>(null);
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
    ref: containerRef as React.RefObject<HTMLDivElement>,
    onResize
  });

  useEffect(() => {
    const loadCSV = async () => {
      const raw = await d3.csv(
        '../../data/top_1000_most_swapped_books.csv',
        d3.autoType
      );

      const count: Record<string, {
        genre: string;
        age: string;
        sum: number;
        count: number;
      }> = {};

      for (const entry of raw as any[]) {
        if (!entry.genre || !entry.age_category || entry.rating_average == null) continue;

        for (const g of entry.genre.split(',')) {
          const genre = g.trim();
          if (!genre) continue;

          const age = entry.age_category;
          const key = `${genre}|${age}`;

          if (!(key in count)) {
            count[key] = { genre, age, sum: 0, count: 0 };
          }

          count[key].sum += +entry.rating_average;
          count[key].count += 1;
        }
      }

      const heatData: HeatCell[] = Object.values(count).map(d => ({
        genre: d.genre,
        age: d.age,
        rating: d.sum / d.count
      }));

      setAllCells(heatData); 

      const genresWithAllAges = new Set(
        d3.groups(heatData, d => d.genre)
          .filter(([_, rows]) => new Set(rows.map(d => d.age)).size === 3)
          .map(([genre]) => genre)
      );

      const topGenres = Array.from(genresWithAllAges).slice(0, 6);

      setCells(heatData.filter(d => topGenres.includes(d.genre)));
    };

    loadCSV();
  }, []);

  useEffect(() => {
    if (isEmpty(cells)) return;
    if (size.width === 0 || size.height === 0) return;

    d3.select('#heatmap-svg').selectAll('*').remove();
    initChart();
  }, [cells, size]);

  function initChart() {
    const svg = d3.select('#heatmap-svg');

    svg.append('rect')
      .attr('width', size.width)
      .attr('height', size.height)
      .attr('fill', '#e4e3e3ff')
      .attr("rx", 8)
      .attr("ry", 8);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)
      .style('font-family', 'sans-serif');

    const width = size.width - margin.left - margin.right;
    const height = size.height - margin.top - margin.bottom;

    const base = Math.min(width, height);

    const axisFont   = Math.max(10, base * 0.045);
    const labelFont  = Math.max(14, base * 0.055);
    const sublabelFont  = Math.max(12, base * 0.055);
    const titleFont  = Math.max(18, base * 0.075);
    const legendFont = Math.max(12, base * 0.045);

    const genres = Array.from(new Set(cells.map(d => d.genre)));
    const ages = ['Children', 'Young Adult', 'Adult'];

    const x = d3.scaleBand()
      .domain(genres)
      .range([0, width])
      .padding(0.06);

    const y = d3.scaleBand()
      .domain(ages)
      .range([height, 0])
      .padding(0.06);

    const color = d3.scaleSequential()
      .domain(d3.extent(allCells, d => d.rating) as [number, number])
      .interpolator(t => d3.interpolateYlOrBr(1 - t));

    g.selectAll('rect.cell')
      .data(cells, (d: any) => `${d.genre}|${d.age}`)
      .join('rect')
      .attr('class', 'cell')
      .attr('x', d => x(d.genre)!)
      .attr('y', d => y(d.age)!)
      .attr('width', x.bandwidth())
      .attr('height', y.bandwidth())
      .attr('rx', 6)
      .attr('ry', 6)
      .attr('fill', d => color(d.rating))
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2);

    const xAxis = g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x));

    xAxis.selectAll('text')
      .style('font-size', `${axisFont}px`)
      .style('fill', '#333');

    const yAxis = g.append('g')
      .call(d3.axisLeft(y));

    yAxis.selectAll('text')
      .style('font-size', `${axisFont}px`)
      .style('fill', '#333');

    g.append('text')
      .attr('x', width / 2)
      .attr('y', height + labelFont * 3)
      .attr('text-anchor', 'middle')
      .style('font-size', `${labelFont}px`)
      .style('font-weight', '600')
      .text('Genre');

    g.append('text')
      .attr('x', width / 2)
      .attr('y', height + labelFont * 4.5)
      .attr('text-anchor', 'middle')
      .style('font-size', `${sublabelFont}px`)
      .style('font-weight', '400')
      .text('*Only including Genres with data spaning all 3 age groups*');

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -labelFont * 6)
      .attr('text-anchor', 'middle')
      .style('font-size', `${labelFont}px`)
      .style('font-weight', '600')
      .text('Age Group');

    g.append('text')
      .attr('x', 0)
      .attr('y', -titleFont * 0.8)
      .attr('font-size', `${titleFont}px`)
      .attr('font-weight', '700')
      .text('Average Book Rating by Genre and Age Group');


    const legendHeight = height * 0.9;
    const legendWidth = 20;

    const legendScale = d3.scaleLinear()
      .domain(color.domain())
      .range([legendHeight, 0]);

    const legend = svg.append('g')
      .attr(
        'transform',
        `translate(${margin.left + width + 40},${margin.top + 20})`
      );

    const [minRating, maxRating] = color.domain();

    const legendAxis = d3.axisRight(legendScale)
      .tickValues([minRating, (minRating + maxRating) / 2, maxRating])
      .tickFormat(d3.format('.1f'));

    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'rating-gradient')
      .attr('x1', '0%')
      .attr('y1', '100%')
      .attr('x2', '0%')
      .attr('y2', '0%');

    d3.range(0, 1.01, 0.01).forEach(t => {
      gradient.append('stop')
        .attr('offset', `${t * 100}%`)
        .attr('stop-color', color(legendScale.invert(t * legendHeight)));
    });

    legend.append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', 'url(#rating-gradient)');

    legend.append('g')
      .attr('transform', `translate(${legendWidth},0)`)
      .call(legendAxis)
      .selectAll('text')
      .style('font-size', `${legendFont}px`);

    legend.append('text')
      .attr('x', -35)
      .attr('y', -legendFont)
      .style('font-size', `${legendFont}px`)
      .style('font-weight', '600')
      .text('Avg Rating');
  }

  return (
    <div ref={containerRef} className="chart-container">
      <svg id="heatmap-svg" width="100%" height="100%" />
    </div>
  );
}
