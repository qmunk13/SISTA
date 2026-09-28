import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Pembayaran } from '../types';
import { TrendingUp, ArrowUpRight, ArrowDownLeft, Calendar, DollarSign, RefreshCw } from 'lucide-react';

interface MonthlyCashflowD3ChartProps {
  pembayaranList: Pembayaran[];
  pengeluaranList?: any[];
}

export interface MonthlyData {
  monthKey: string; // e.g. "2026-01"
  monthLabel: string; // e.g. "Jan"
  pemasukan: number;
  pengeluaran: number;
  surplus: number;
}

export default function MonthlyCashflowD3Chart({
  pembayaranList,
  pengeluaranList = []
}: MonthlyCashflowD3ChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [hoveredData, setHoveredData] = useState<MonthlyData | null>(null);
  const [chartMode, setChartMode] = useState<'area' | 'bar'>('area');

  // Compute monthly totals
  const getMonthlyData = (): MonthlyData[] => {
    const months = [
      { key: '01', label: 'Jan' },
      { key: '02', label: 'Feb' },
      { key: '03', label: 'Mar' },
      { key: '04', label: 'Apr' },
      { key: '05', label: 'Mei' },
      { key: '06', label: 'Jun' },
      { key: '07', label: 'Jul' },
      { key: '08', label: 'Ags' },
      { key: '09', label: 'Sep' },
      { key: '10', label: 'Okt' },
      { key: '11', label: 'Nov' },
      { key: '12', label: 'Des' }
    ];

    return months.map(m => {
      const yearMonth = `${selectedYear}-${m.key}`;

      // Sum Pemasukan (Pembayaran) for this month
      const totalPemasukan = pembayaranList
        .filter(p => {
          const tgl = p.tglBayar || (p as any).tanggal || '';
          return tgl.startsWith(yearMonth);
        })
        .reduce((sum, p) => sum + (Number((p as any).jumlah || (p as any).nominal || (p as any).jumlahBayar) || 0), 0);

      // Sum Pengeluaran for this month
      const totalPengeluaran = pengeluaranList
        .filter(e => {
          const tgl = e.tanggal || '';
          return tgl.startsWith(yearMonth);
        })
        .reduce((sum, e) => sum + (Number(e.nominal) || 0), 0);

      return {
        monthKey: yearMonth,
        monthLabel: m.label,
        pemasukan: totalPemasukan,
        pengeluaran: totalPengeluaran,
        surplus: totalPemasukan - totalPengeluaran
      };
    });
  };

  const data = getMonthlyData();

  const totalIn = data.reduce((acc, d) => acc + d.pemasukan, 0);
  const totalOut = data.reduce((acc, d) => acc + d.pengeluaran, 0);
  const netCash = totalIn - totalOut;

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val);
  };

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    // Clear existing chart
    d3.select(svgRef.current).selectAll('*').remove();

    const containerWidth = containerRef.current.clientWidth || 600;
    const height = 300;
    const margin = { top: 20, right: 30, bottom: 40, left: 65 };
    const width = containerWidth - margin.left - margin.right;

    const svg = d3
      .select(svgRef.current)
      .attr('width', containerWidth)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const innerHeight = height - margin.top - margin.bottom;

    // X Scale
    const xScale = d3
      .scaleBand()
      .domain(data.map(d => d.monthLabel))
      .range([0, width])
      .padding(0.3);

    // Y Scale
    const maxVal = d3.max(data, d => Math.max(d.pemasukan, d.pengeluaran, d.surplus)) || 1000000;
    const yScale = d3
      .scaleLinear()
      .domain([0, maxVal * 1.15])
      .nice()
      .range([innerHeight, 0]);

    // Gridlines
    const yAxisGrid = d3
      .axisLeft(yScale)
      .tickSize(-width)
      .tickFormat(() => '')
      .ticks(5);

    svg
      .append('g')
      .attr('class', 'grid')
      .call(yAxisGrid)
      .selectAll('line')
      .attr('stroke', '#f1f5f9')
      .attr('stroke-dasharray', '3,3');

    // Axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(5)
      .tickFormat(d => {
        const num = Number(d);
        if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'M';
        if (num >= 1000000) return (num / 1000000).toFixed(0) + 'Jt';
        if (num >= 1000) return (num / 1000).toFixed(0) + 'Rb';
        return String(num);
      });

    svg
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .style('fill', '#64748b')
      .style('font-size', '11px')
      .style('font-weight', '700');

    svg
      .append('g')
      .call(yAxis)
      .selectAll('text')
      .style('fill', '#64748b')
      .style('font-size', '10px')
      .style('font-weight', '600');

    // Remove domain axis lines for cleaner design
    svg.selectAll('.domain').attr('stroke', '#cbd5e1').attr('stroke-width', '1');

    if (chartMode === 'area') {
      // Gradient definitions
      const defs = svg.append('defs');

      // Gradient Pemasukan (Emerald)
      const gradIn = defs
        .append('linearGradient')
        .attr('id', 'gradPemasukan')
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '0%')
        .attr('y2', '100%');

      gradIn.append('stop').attr('offset', '0%').attr('stop-color', '#10b981').attr('stop-opacity', 0.4);
      gradIn.append('stop').attr('offset', '100%').attr('stop-color', '#10b981').attr('stop-opacity', 0.0);

      // Gradient Pengeluaran (Rose)
      const gradOut = defs
        .append('linearGradient')
        .attr('id', 'gradPengeluaran')
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '0%')
        .attr('y2', '100%');

      gradOut.append('stop').attr('offset', '0%').attr('stop-color', '#f43f5e').attr('stop-opacity', 0.3);
      gradOut.append('stop').attr('offset', '100%').attr('stop-color', '#f43f5e').attr('stop-opacity', 0.0);

      // Area generator
      const areaIn = d3
        .area<MonthlyData>()
        .x(d => (xScale(d.monthLabel) || 0) + xScale.bandwidth() / 2)
        .y0(innerHeight)
        .y1(d => yScale(d.pemasukan))
        .curve(d3.curveMonotoneX);

      const areaOut = d3
        .area<MonthlyData>()
        .x(d => (xScale(d.monthLabel) || 0) + xScale.bandwidth() / 2)
        .y0(innerHeight)
        .y1(d => yScale(d.pengeluaran))
        .curve(d3.curveMonotoneX);

      // Line generator
      const lineIn = d3
        .line<MonthlyData>()
        .x(d => (xScale(d.monthLabel) || 0) + xScale.bandwidth() / 2)
        .y(d => yScale(d.pemasukan))
        .curve(d3.curveMonotoneX);

      const lineOut = d3
        .line<MonthlyData>()
        .x(d => (xScale(d.monthLabel) || 0) + xScale.bandwidth() / 2)
        .y(d => yScale(d.pengeluaran))
        .curve(d3.curveMonotoneX);

      // Draw Areas
      svg
        .append('path')
        .datum(data)
        .attr('fill', 'url(#gradPemasukan)')
        .attr('d', areaIn);

      svg
        .append('path')
        .datum(data)
        .attr('fill', 'url(#gradPengeluaran)')
        .attr('d', areaOut);

      // Draw Lines
      svg
        .append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', '#10b981')
        .attr('stroke-width', 3)
        .attr('d', lineIn);

      svg
        .append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', '#f43f5e')
        .attr('stroke-width', 2.5)
        .attr('stroke-dasharray', '4,3')
        .attr('d', lineOut);

      // Circles for data points
      svg
        .selectAll('.dot-in')
        .data(data)
        .enter()
        .append('circle')
        .attr('class', 'dot-in')
        .attr('cx', d => (xScale(d.monthLabel) || 0) + xScale.bandwidth() / 2)
        .attr('cy', d => yScale(d.pemasukan))
        .attr('r', 5)
        .attr('fill', '#10b981')
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer');
    } else {
      // Bar chart mode
      const barWidth = xScale.bandwidth() / 2 - 2;

      // Pemasukan Bars
      svg
        .selectAll('.bar-in')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar-in')
        .attr('x', d => (xScale(d.monthLabel) || 0))
        .attr('y', d => yScale(d.pemasukan))
        .attr('width', barWidth)
        .attr('height', d => innerHeight - yScale(d.pemasukan))
        .attr('fill', '#10b981')
        .attr('rx', 4);

      // Pengeluaran Bars
      svg
        .selectAll('.bar-out')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar-out')
        .attr('x', d => (xScale(d.monthLabel) || 0) + barWidth + 4)
        .attr('y', d => yScale(d.pengeluaran))
        .attr('width', barWidth)
        .attr('height', d => innerHeight - yScale(d.pengeluaran))
        .attr('fill', '#f43f5e')
        .attr('rx', 4);
    }

    // Transparent overlay bars for hover interaction
    svg
      .selectAll('.overlay-bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'overlay-bar')
      .attr('x', d => xScale(d.monthLabel) || 0)
      .attr('y', 0)
      .attr('width', xScale.bandwidth())
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .style('cursor', 'pointer')
      .on('mouseenter', (event, d) => {
        setHoveredData(d);
      })
      .on('mouseleave', () => {
        setHoveredData(null);
      });

  }, [data, chartMode, selectedYear]);

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5 animate-fade-in-up">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-slate-800 text-base uppercase tracking-tight font-display">
                Tren Pembayaran & Arus Kas Bulanan (D3.js Visualizer)
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Sistem analisis grafik arus kas real-time berbasis D3 Engine
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Chart type toggle */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-bold text-slate-600">
            <button
              onClick={() => setChartMode('area')}
              className={`px-3 py-1.5 rounded-lg transition ${
                chartMode === 'area'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'hover:text-slate-900'
              }`}
            >
              Kurva Area
            </button>
            <button
              onClick={() => setChartMode('bar')}
              className={`px-3 py-1.5 rounded-lg transition ${
                chartMode === 'bar'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'hover:text-slate-900'
              }`}
            >
              Batang
            </button>
          </div>

          {/* Year selector */}
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-extrabold text-slate-700"
          >
            <option value="2026">Tahun 2026</option>
            <option value="2025">Tahun 2025</option>
            <option value="2027">Tahun 2027</option>
          </select>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-sm">
            <ArrowUpRight className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block">
              Total Pemasukan {selectedYear}
            </span>
            <span className="text-base font-black text-slate-800 font-mono">
              {formatRupiah(totalIn)}
            </span>
          </div>
        </div>

        <div className="bg-rose-50/60 border border-rose-100 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-3 bg-rose-500 text-white rounded-xl shadow-sm">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider block">
              Total Pengeluaran {selectedYear}
            </span>
            <span className="text-base font-black text-slate-800 font-mono">
              {formatRupiah(totalOut)}
            </span>
          </div>
        </div>

        <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-3 bg-blue-600 text-white rounded-xl shadow-sm">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider block">
              Arus Kas Bersih (Surplus)
            </span>
            <span className={`text-base font-black font-mono ${netCash >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {formatRupiah(netCash)}
            </span>
          </div>
        </div>
      </div>

      {/* D3 SVG Canvas Container */}
      <div className="relative w-full overflow-hidden" ref={containerRef}>
        <svg ref={svgRef} className="w-full h-[300px]"></svg>

        {/* Hover Tooltip Overlay */}
        {hoveredData && (
          <div className="absolute top-2 right-4 bg-slate-900/90 backdrop-blur-md text-white p-3 rounded-2xl text-xs shadow-xl space-y-1 font-sans border border-slate-700">
            <div className="font-extrabold text-amber-400 uppercase text-[10px] flex items-center gap-1 border-b border-slate-700 pb-1">
              <Calendar className="w-3 h-3" /> Bulan: {hoveredData.monthLabel} {selectedYear}
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-emerald-400">Pemasukan:</span>
              <span className="font-mono font-bold">{formatRupiah(hoveredData.pemasukan)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-rose-400">Pengeluaran:</span>
              <span className="font-mono font-bold">{formatRupiah(hoveredData.pengeluaran)}</span>
            </div>
            <div className="flex justify-between gap-4 border-t border-slate-800 pt-1">
              <span className="text-blue-300 font-bold">Surplus Kas:</span>
              <span className="font-mono font-black text-white">{formatRupiah(hoveredData.surplus)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Chart Legend */}
      <div className="flex items-center justify-center gap-6 text-xs text-slate-500 font-bold pt-1 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
          <span>Pemasukan Tagihan (Siswa)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span>
          <span>Pengeluaran Operasional</span>
        </div>
      </div>
    </div>
  );
}
