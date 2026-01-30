import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import { isEmpty } from 'lodash';
import { useResizeObserver, useDebounceCallback } from 'usehooks-ts';

import { ComponentSize } from '../types';

interface SankeyNode {
  name: string;
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export default function SankeyChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 });
  const [data, setData] = useState<any[]>([]);

  const onResize = useDebounceCallback(
    (size: ComponentSize) => setSize(size),
    200
  );

  useResizeObserver({
    ref: containerRef as React.RefObject<HTMLDivElement>,
    onResize
  });

  useEffect(() => {
    d3.csv('../../data/top_1000_most_swapped_books.csv', d3.autoType)
      .then(d => setData(d as any[]));
  }, []);

  useEffect(() => {
    if (isEmpty(data)) return;
    if (!size.width || !size.height) return;

    d3.select('#sankey-svg').selectAll('*').remove();
    initChart();
  }, [data, size]);

  function initChart() {
    const width = size.width;
    const height = Math.max(320, Math.min(size.height, width * 0.37));

    const sankeyLayout = sankey<SankeyNode, SankeyLink>()
    .nodeId(d => d.name)
    .nodeWidth(Math.max(14, width * 0.02))
    .nodePadding(Math.max(12, height * 0.035))
    .extent([
        [40, 40],
        [width - 40, height - 40]
    ]);

    const svg = d3.select('#sankey-svg')
      .attr('width', width)
      .attr('height', height)
      .style('font-family', 'sans-serif');
    
      svg.append('rect')
      .attr('width', size.width)
      .attr('height', size.height)
      .attr('fill', '#e4e3e3ff')
      .attr("rx", 8)
      .attr("ry", 8);

    const genreCounts: Record<string, number> = {};

    for (const entry of data) {
      if (!entry.genre) continue;

      for (const g of entry.genre.split(',')) {
        const genre = g.trim();
        if (!genre) continue;
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
      }
    }

    const topGenresBar = Object.entries(genreCounts)
      .map(([genre, value]) => ({ genre, value }))
      .sort((a, b) => d3.descending(a.value, b.value))
      .slice(0, 5);

    const allowedGenres = new Set(topGenresBar.map(d => d.genre));


    const genreColors: Record<string, string> = {
      'Genre: Fantasy': '#22c4c9',
      'Genre: Sci-Fi': '#22c938',
      'Genre: Historical Fiction': '#e69d2c',
      'Genre: Fiction': '#c122c9',
      'Genre: Thriller': '#c92225'
    };

    const ageColors: Record<string, string> = {
      'Age: Adult': '#f70094',
      'Age: Young Adult': '#3f756c',
      'Age: Children': '#753434'
    };

    const adaptedTrueColor = '#36ad5e';
    const adaptedFalseColor = '#e62929';

    const genreToAge: Record<string, number> = {};
    const ageToAdapted: Record<string, number> = {};

    for (const entry of data) {
      if (!entry.genre || !entry.age_category || entry.adapted_to_movie == null) continue;

      const age = entry.age_category;
      const adapted = entry.adapted_to_movie === 'TRUE' ? 'True' : 'False';

      for (const g of entry.genre.split(',')) {
        const genre = g.trim();
        if (!genre) continue;

        if (!allowedGenres.has(genre)) continue;

        const k1 = genre + '||' + age;
        genreToAge[k1] = (genreToAge[k1] || 0) + 1;

        const k2 = age + '||' + adapted;
        ageToAdapted[k2] = (ageToAdapted[k2] || 0) + 1;
      }
    }

    const links: SankeyLink[] = [];

    for (const k in genreToAge) {
      const [genre, age] = k.split('||');
      links.push({
        source: 'Genre: ' + genre,
        target: 'Age: ' + age,
        value: genreToAge[k]
      });
    }

    for (const k in ageToAdapted) {
      const [age, adapted] = k.split('||');
      links.push({
        source: 'Age: ' + age,
        target: 'Adapted: ' + adapted,
        value: ageToAdapted[k]
      });
    }

    const nodeSet = new Set<string>();
    links.forEach(l => {
      nodeSet.add(l.source);
      nodeSet.add(l.target);
    });

    const nodes: SankeyNode[] = Array.from(nodeSet).map(name => ({ name }));
    

    const { nodes: sankeyNodes, links: sankeyLinks } =
      sankeyLayout({
        nodes: nodes.map(d => ({ ...d })),
        links: links.map(d => ({ ...d }))
      });

    svg.append('g')
      .attr('fill', 'none')
      .selectAll('path')
      .data(sankeyLinks)
      .join('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('stroke-width', d => Math.max(1, d.width ?? 0))
      .attr('stroke-opacity', 0.45)
      .attr('stroke', d => {
        const source = d.source as SankeyNode;

        if (source.name.startsWith('Genre:'))
          return genreColors[source.name] || '#999';

        if (source.name.startsWith('Age:'))
          return ageColors[source.name] || '#999';

        return '#999';
      });

    const node = svg.append('g')
      .selectAll('g')
      .data(sankeyNodes)
      .join('g');

    node.append('rect')
      .attr('x', d => d.x0!)
      .attr('y', d => d.y0!)
      .attr('width', d => d.x1! - d.x0!)
      .attr('height', d => d.y1! - d.y0!)
      .attr('fill', d => {
        if (d.name.startsWith('Genre:')) return genreColors[d.name];
        if (d.name.startsWith('Age:')) return ageColors[d.name];
        if (d.name === 'Adapted: True') return adaptedTrueColor;
        if (d.name === 'Adapted: False') return adaptedFalseColor;
        return '#ccc';
      })
      .attr('stroke', '#333');

    node.append('text')
      .attr('x', d => d.x0! < width / 2 ? d.x1! + 6 : d.x0! - 6)
      .attr('y', d => (d.y0! + d.y1!) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', d => d.x0! < width / 2 ? 'start' : 'end')
      .style('font-size', '13px')
      .text(d => {
        if (d.name === 'Adapted: True') return 'Movie Adaptation';
        if (d.name === 'Adapted: False') return 'No Movie Adaptation';
        return d.name.replace(/^.*?: /, '');
      });

    svg.append('text')
      .attr('x', 20)
      .attr('y', 30)
      .attr('font-size', '22px')
      .attr('font-weight', '700')
      .text('Flow from Genre to Age Group to Movie Adaptation');
  }

  return (
    <div ref={containerRef} className="chart-container">
      <svg id="sankey-svg" />
    </div>
  );
}
