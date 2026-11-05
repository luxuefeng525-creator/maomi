/* SPDX-License-Identifier: MIT — 大屏工坊 flat 预设（数据看板）
 * 结构：① 图标 ② 数据 DATA ③ 渲染函数 ④ 交互与生命周期
 * 改内容通常只需要动 DATA；布局/组件不够用时再改 render* 函数或 styles.css。
 */
(() => {
  'use strict';
  const stage = document.querySelector('#screen');
  VizLabRuntime.mountStage(stage, 1920, 1080);

  /* ---------- ① 图标 ---------- */
  const ICONS = {
    layers: 'm12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5',
    fullscreen: 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',
    close: 'm6 6 12 12M6 18 18 6',
    chart: 'M4 3v18h17M8 17v-6m5 6V7m5 10V4',
    users: 'M16 21v-3c0-3-3-5-6-5s-6 2-6 5v3m6-18a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
    box: 'm12 3 9 5v9l-9 5-9-5V8l9-5Zm0 10v9M3 8l9 5 9-5',
    clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18m0 4v6l4 2',
    alert: 'm12 3 10 18H2L12 3Zm0 6v5m0 3h.01',
    energy: 'm13 2-9 12h7l-1 8 10-13h-7l0-7Z',
    shield: 'm12 2 8 3v7c0 5-5 8-8 10-3-2-8-5-8-10V5l8-3Zm-4 10 3 3 5-6',
    car: 'm4 10 2-6h12l2 6M3 10h18v9H3v-9Zm4 4h1m8 0h1M5 19v2m14-2v2',
    target: 'M12 3a9 9 0 1 0 9 9M12 7a5 5 0 1 0 5 5m-5 0L22 2m-7 0h7v7',
  };
  const icon = (name) =>
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' +
    (ICONS[name] || ICONS.layers) +
    '"/></svg>';
  const paintIcons = () =>
    document.querySelectorAll('[data-icon]').forEach((el) => {
      el.innerHTML = icon(el.dataset.icon);
    });

  const esc = (v) =>
    String(v).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const num = (v) =>
    typeof v === 'number' ? v.toLocaleString('zh-CN', { maximumFractionDigits: 2 }) : v;

  /* ---------- ② 数据 ---------- */
  const DATA = {
    // 5 个核心指标：label 指标名 / code 编号 / value 数值 / unit 单位 / delta 同比 / dir 方向
    kpis: [
      { label: '接入终端', code: 'DEVICE', value: 128640, unit: '台', delta: '+6.2%', dir: 'up', spark: [42, 48, 45, 56, 61, 58, 67, 72, 70, 79] },
      { label: '今日处理量', code: 'VOLUME', value: 86420, unit: '单', delta: '+11.4%', dir: 'up', spark: [30, 38, 52, 44, 61, 70, 66, 78, 84, 92] },
      { label: '平均响应', code: 'LATENCY', value: 186, unit: 'ms', delta: '-8.1%', dir: 'down', spark: [78, 72, 66, 70, 58, 54, 49, 52, 44, 40] },
      { label: '在线率', code: 'UPTIME', value: 99.62, unit: '%', delta: '+0.3%', dir: 'up', spark: [88, 90, 89, 93, 92, 95, 96, 94, 97, 98] },
      { label: '异常告警', code: 'ALERT', value: 12, unit: '条', delta: '-3 条', dir: 'up', spark: [60, 52, 58, 44, 48, 36, 40, 30, 26, 22] },
    ],
    // 主趋势图：periods 切换，每个 series 各自提供各周期数据
    main: {
      title: '核心业务趋势',
      code: 'TREND / 24H',
      unit: '万次',
      periods: [
        { id: 'day', name: '今日' },
        { id: 'week', name: '本周' },
        { id: 'month', name: '本月' },
      ],
      labels: ['00', '03', '06', '09', '12', '15', '18', '21', '24'],
      series: [
        { name: '实时请求', color: '#3ad7ff', data: { day: [12, 8, 14, 38, 62, 74, 88, 71, 64], week: [58, 52, 61, 74, 88, 92, 96, 84, 78], month: [72, 68, 74, 82, 91, 96, 99, 93, 88] } },
        { name: '缓存命中', color: '#7b6bff', data: { day: [8, 6, 10, 26, 44, 56, 68, 55, 48], week: [42, 38, 46, 58, 70, 74, 78, 68, 62], month: [56, 52, 58, 66, 76, 82, 86, 80, 74] } },
      ],
      notes: {
        day: '峰值出现在 18:00，实时请求 88 万次，缓存命中率 76.4%。',
        week: '工作日负载稳定，周四为本周峰值，整体较上周增长 9.1%。',
        month: '月度曲线平稳上行，月末较月初提升 22.4%，容量水位 68%。',
      },
    },
    // 左栏：rank 排行 / bars 占比 / facts 事实
    left: [
      {
        type: 'rank',
        title: '区域业务排行',
        code: '01 / REGION',
        unit: '万单',
        items: [
          { name: '华东大区', value: 286.4 },
          { name: '华南大区', value: 241.8 },
          { name: '华北大区', value: 198.2 },
          { name: '西南大区', value: 156.7 },
          { name: '华中大区', value: 132.5 },
          { name: '东北大区', value: 98.3 },
        ],
      },
      {
        type: 'bars',
        title: '业务构成',
        code: '02 / MIX',
        items: [
          { name: '实时调度', value: 82, display: '42%' },
          { name: '批量处理', value: 64, display: '28%', color: '#7b6bff' },
          { name: '增值服务', value: 38, display: '18%', color: '#35e0a6' },
          { name: '其他业务', value: 22, display: '12%', color: '#5c7099' },
        ],
        note: '实时调度仍为主营构成，增值服务环比提升 <b>3.2%</b>。',
      },
      {
        type: 'facts',
        title: '运行水位',
        code: '03 / CAPACITY',
        items: [
          ['算力使用率', '68.4', '%'],
          ['存储水位', '52.1', '%'],
          ['队列积压', '1,286', '条'],
          ['平均排队', '42', 'ms'],
        ],
        note: '容量充足，<b>无需扩容</b>；队列积压处于正常区间。',
      },
    ],
    // 右栏：donut 占比 / timeline 事件 / list 明细
    right: [
      {
        type: 'donut',
        title: '渠道分布',
        code: '04 / CHANNEL',
        center: ['12.8', '万次'],
        items: [
          { name: '移动端', value: 52, color: '#3ad7ff' },
          { name: 'Web 端', value: 26, color: '#7b6bff' },
          { name: '开放接口', value: 14, color: '#35e0a6' },
          { name: '其他', value: 8, color: '#5c7099' },
        ],
      },
      {
        type: 'timeline',
        title: '实时事件',
        code: '05 / EVENTS',
        items: [
          { time: '18:42', level: 'ok', text: '华东节点扩容完成', note: '新增 8 个计算实例，已并入调度' },
          { time: '18:26', level: 'warn', text: '华南链路延迟升高', note: '平均 214ms，超出阈值 180ms' },
          { time: '18:10', level: '', text: '批次任务 T-2087 完成', note: '处理 12.4 万条，耗时 3 分 12 秒' },
          { time: '17:55', level: 'ok', text: '数据校验通过', note: '一致性校验 100%，无差异' },
        ],
      },
      {
        type: 'list',
        title: '服务健康度',
        code: '06 / HEALTH',
        rows: [
          { name: '调度服务', a: '1,284', b: '正常' },
          { name: '缓存集群', a: '86%', b: '正常' },
          { name: '消息队列', a: '1.2k', b: '繁忙' },
          { name: '存储网关', a: '52%', b: '正常' },
          { name: '鉴权服务', a: '99.9%', b: '正常' },
        ],
      },
    ],
    // 底部三个小图：bar / line / progress
    mini: [
      { type: 'bar', title: '分时请求量', code: 'HOURLY', labels: ['00', '04', '08', '12', '16', '20'], values: [22, 16, 48, 72, 88, 64], color: '#3ad7ff' },
      { type: 'line', title: '响应时间', code: 'LATENCY', labels: ['00', '04', '08', '12', '16', '20'], values: [186, 172, 210, 198, 164, 152], color: '#35e0a6' },
      { type: 'progress', title: '资源分配', code: 'RESOURCE', items: [['计算', 68], ['存储', 52], ['带宽', 74], ['连接数', 41]] },
    ],
    ticker: [
      ['18:42', '华东节点扩容完成，新增 8 个计算实例'],
      ['18:26', '华南链路延迟升高，已自动切换备用链路'],
      ['18:10', '批次任务 T-2087 处理完成，共 12.4 万条'],
      ['17:58', '存储网关完成滚动升级，业务无感知'],
    ],
    footer: '演示数据 · 所有指标与操作均为本地模拟',
  };

  /* ---------- ③ 渲染 ---------- */
  const q = (sel, root = document) => root.querySelector(sel);
  const panel = (title, code, body, opts = {}) =>
    '<section class="ds-panel' +
    (opts.cls ? ' ' + opts.cls : '') +
    '"><div class="ds-panel-head"><h2>' +
    icon(opts.icon || 'chart') +
    esc(title) +
    '</h2><span>' +
    esc(code) +
    '</span></div><div class="ds-panel-body' +
    (opts.flush ? ' flush' : '') +
    '">' +
    body +
    '</div></section>';

  function sparkline(values, color) {
    const w = 92,
      h = 26,
      max = Math.max(...values),
      min = Math.min(...values),
      x = (i) => (i * w) / (values.length - 1),
      y = (v) => h - 3 - ((v - min) / (max - min || 1)) * (h - 6);
    const pts = values.map((v, i) => x(i).toFixed(1) + ',' + y(v).toFixed(1)).join(' ');
    return (
      '<svg class="ds-kpi-spark" viewBox="0 0 ' +
      w +
      ' ' +
      h +
      '" preserveAspectRatio="none" aria-hidden="true"><polyline points="' +
      pts +
      '" fill="none" stroke="' +
      color +
      '" stroke-width="1.4" stroke-linejoin="round"/></svg>'
    );
  }

  function renderKpis() {
    q('#ds-kpis').innerHTML = DATA.kpis
      .map(
        (k, i) =>
          '<article class="ds-kpi" data-kpi="' +
          i +
          '" tabindex="0" role="button" aria-label="' +
          esc(k.label + ' ' + num(k.value) + k.unit) +
          '"><span class="ds-kpi-label"><i>0' +
          (i + 1) +
          '</i>' +
          esc(k.label) +
          '</span><div class="ds-kpi-value"><strong class="ds-num">' +
          num(k.value) +
          '</strong><small>' +
          esc(k.unit) +
          '</small></div><div class="ds-kpi-foot"><span class="ds-kpi-delta ' +
          (k.dir === 'down' ? 'down' : k.dir === 'flat' ? 'flat' : '') +
          '">' +
          esc(k.delta) +
          '</span>' +
          sparkline(k.spark, k.dir === 'down' ? '#ff5d7a' : '#3ad7ff') +
          '</div></article>',
      )
      .join('');
  }

  function renderMain(period) {
    const conf = DATA.main,
      series = conf.series,
      labels = conf.labels;
    const host = q('#ds-main');
    host.innerHTML =
      '<div class="ds-main-head"><h2 class="ds-main-title">' +
      icon('chart') +
      esc(conf.title) +
      '</h2><div style="display:flex;align-items:center;gap:18px"><div class="ds-main-legend">' +
      series
        .map((s) => '<span><i style="background:' + s.color + '"></i>' + esc(s.name) + '</span>')
        .join('') +
      '</div><div class="ds-seg" role="group" aria-label="时间范围">' +
      conf.periods
        .map(
          (p) =>
            '<button data-period="' +
            p.id +
            '" aria-pressed="' +
            (p.id === period) +
            '">' +
            esc(p.name) +
            '</button>',
        )
        .join('') +
      '</div></div></div><div class="ds-panel-body"><svg class="ds-chart" id="ds-main-chart"></svg><span class="ds-tip" id="ds-main-tip" hidden></span><p class="ds-note" id="ds-main-note">' +
      esc(conf.notes[period]) +
      '</p></div>';
    paintIcons();
    drawMain(period);
  }

  function drawMain(period) {
    const svg = d3.select('#ds-main-chart');
    svg.selectAll('*').remove();
    const node = svg.node();
    const W = Math.max(520, node.clientWidth || 900),
      H = Math.max(220, node.clientHeight || 420);
    svg.attr('viewBox', '0 0 ' + W + ' ' + H);
    const m = { t: 16, r: 16, b: 26, l: 42 },
      iw = W - m.l - m.r,
      ih = H - m.t - m.b;
    const conf = DATA.main,
      labels = conf.labels,
      series = conf.series;
    const all = series.flatMap((s) => s.data[period]);
    const max = Math.ceil(Math.max(...all) / 20) * 20 || 20;
    const x = d3.scalePoint().domain(labels).range([m.l, m.l + iw]),
      y = d3.scaleLinear().domain([0, max]).range([m.t + ih, m.t]);

    const g = svg.append('g');
    [0, 0.25, 0.5, 0.75, 1].forEach((f) => {
      const yy = y(max * f);
      g.append('line').attr('class', 'ds-grid').attr('x1', m.l).attr('x2', m.l + iw).attr('y1', yy).attr('y2', yy);
      g.append('text').attr('x', m.l - 8).attr('y', yy + 3).attr('text-anchor', 'end').text(Math.round(max * f));
    });
    g.append('line').attr('class', 'ds-axis').attr('x1', m.l).attr('x2', m.l + iw).attr('y1', m.t + ih).attr('y2', m.t + ih);
    labels.forEach((l, i) =>
      g.append('text').attr('x', x(l)).attr('y', H - 8).attr('text-anchor', 'middle').text(l),
    );

    const defs = svg.append('defs');
    series.forEach((s, i) => {
      const grad = defs
        .append('linearGradient')
        .attr('id', 'ds-grad-' + i)
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', 0)
        .attr('y2', 1);
      grad.append('stop').attr('offset', 0).attr('stop-color', s.color).attr('stop-opacity', 0.3);
      grad.append('stop').attr('offset', 1).attr('stop-color', s.color).attr('stop-opacity', 0.02);
    });
    series.forEach((s, i) => {
      const values = s.data[period];
      const area = d3
        .area()
        .x((d, j) => x(labels[j]))
        .y0(m.t + ih)
        .y1((d) => y(d))
        .curve(d3.curveMonotoneX);
      const line = d3
        .line()
        .x((d, j) => x(labels[j]))
        .y((d) => y(d))
        .curve(d3.curveMonotoneX);
      // 只给第一条线上面积，避免多条面积叠加发脏
      if (i === 0) g.append('path').datum(values).attr('d', area).attr('fill', 'url(#ds-grad-' + i + ')');
      g.append('path')
        .datum(values)
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', s.color)
        .attr('stroke-width', 2)
        .attr('stroke-linejoin', 'round');
      g.selectAll('.dot-' + i)
        .data(values)
        .join('circle')
        .attr('class', 'ds-dot')
        .attr('cx', (d, j) => x(labels[j]))
        .attr('cy', (d) => y(d))
        .attr('r', 3)
        .attr('fill', s.color);
    });

    // 悬浮提示：按最近的 x 位置取整列数据
    const tip = q('#ds-main-tip');
    const focus = g.append('line').attr('class', 'ds-axis').attr('y1', m.t).attr('y2', m.t + ih).attr('opacity', 0);
    g.append('rect')
      .attr('x', m.l)
      .attr('y', m.t)
      .attr('width', iw)
      .attr('height', ih)
      .attr('fill', 'transparent')
      .on('pointermove', (event) => {
        const [px] = d3.pointer(event);
        let idx = 0,
          best = Infinity;
        labels.forEach((l, j) => {
          const d = Math.abs(x(l) - px);
          if (d < best) {
            best = d;
            idx = j;
          }
        });
        focus.attr('x1', x(labels[idx])).attr('x2', x(labels[idx])).attr('opacity', 0.6);
        tip.hidden = false;
        tip.innerHTML =
          '<b>' +
          esc(labels[idx]) +
          ':00</b> ' +
          series.map((s) => esc(s.name) + ' ' + num(s.data[period][idx])).join(' · ');
        tip.style.left = x(labels[idx]) + 'px';
        tip.style.top = y(Math.max(...series.map((s) => s.data[period][idx]))) - 6 + 'px';
      })
      .on('pointerleave', () => {
        tip.hidden = true;
        focus.attr('opacity', 0);
      });
  }

  /* 环形图登记表：渲染时登记 id → 配置，之后统一画；左右栏各放一个也不会撞 id */
  const donutTargets = [];
  const donutIdFor = (conf, host, idx) => {
    const id = 'ds-donut-' + host.replace('#', '') + '-' + idx;
    donutTargets.push({ id, conf });
    return id;
  };

  function renderColumn(host, panels) {
    q(host).innerHTML = panels
      .map((p, idx) => {
        if (p.type === 'rank')
          return panel(
            p.title,
            p.code,
            '<div class="ds-rank">' +
              p.items
                .map(
                  (it, i) =>
                    '<div class="ds-rank-row"><em>' +
                    (i + 1) +
                    '</em><span>' +
                    esc(it.name) +
                    '</span><strong class="ds-num">' +
                    num(it.value) +
                    ' <small style="color:var(--dim);font-size:9px">' +
                    esc(p.unit || '') +
                    '</small></strong></div>',
                )
                .join('') +
              '</div>',
            { icon: 'target' },
          );
        if (p.type === 'bars')
          return panel(
            p.title,
            p.code,
            '<div class="ds-bars">' +
              p.items
                .map(
                  (it) =>
                    '<div class="ds-bar"><span>' +
                    esc(it.name) +
                    '</span><div><i style="width:' +
                    Math.min(100, it.value) +
                    '%;' +
                    (it.color ? 'background:linear-gradient(90deg,' + it.color + '66,' + it.color + ')' : '') +
                    '"></i></div><strong class="ds-num">' +
                    esc(it.display || it.value + '%') +
                    '</strong></div>',
                )
                .join('') +
              '</div>' +
              (p.note ? '<p class="ds-note">' + p.note + '</p>' : ''),
            { icon: 'box' },
          );
        if (p.type === 'facts')
          return panel(
            p.title,
            p.code,
            '<div class="ds-facts">' +
              p.items
                .map(
                  ([label, value, unit]) =>
                    '<div><span>' +
                    esc(label) +
                    '</span><strong class="ds-num">' +
                    esc(value) +
                    '<small>' +
                    esc(unit || '') +
                    '</small></strong></div>',
                )
                .join('') +
              '</div>' +
              (p.note ? '<p class="ds-note">' + p.note + '</p>' : ''),
            { icon: 'energy' },
          );
        if (p.type === 'donut')
          return panel(
            p.title,
            p.code,
            '<div class="ds-donut-wrap"><div class="ds-donut"><svg class="ds-chart" id="' +
              donutIdFor(p, host, idx) +
              '"></svg><div class="ds-donut-center"><strong class="ds-num">' +
              esc(p.center[0]) +
              '</strong><span>' +
              esc(p.center[1]) +
              '</span></div></div><div class="ds-legend">' +
              p.items
                .map(
                  (it) =>
                    '<div><i style="background:' +
                    it.color +
                    '"></i><span>' +
                    esc(it.name) +
                    '</span><strong>' +
                    it.value +
                    '%</strong></div>',
                )
                .join('') +
              '</div></div>',
            { icon: 'chart' },
          );
        if (p.type === 'timeline')
          return panel(
            p.title,
            p.code,
            '<div class="ds-timeline">' +
              p.items
                .map(
                  (it) =>
                    '<div class="ds-event"><time>' +
                    esc(it.time) +
                    '</time><i class="' +
                    it.level +
                    '"></i><p>' +
                    esc(it.text) +
                    '<small>' +
                    esc(it.note || '') +
                    '</small></p></div>',
                )
                .join('') +
              '</div>',
            { icon: 'clock' },
          );
        if (p.type === 'list')
          return panel(
            p.title,
            p.code,
            '<div class="ds-list">' +
              p.rows
                .map(
                  (r) =>
                    '<div class="ds-list-row"><b>' +
                    esc(r.name) +
                    '</b><span>' +
                    esc(r.a) +
                    '</span><span class="ds-tag ' +
                    (r.b === '繁忙' ? 'warn' : r.b === '异常' ? 'bad' : '') +
                    '">' +
                    esc(r.b) +
                    '</span></div>',
                )
                .join('') +
              '</div>',
            { icon: 'shield' },
          );
        return '';
      })
      .join('');
    paintIcons();
  }

  function renderMini() {
    q('#ds-mini').innerHTML = DATA.mini
      .map((m, idx) => {
        if (m.type === 'progress')
          return panel(
            m.title,
            m.code,
            '<div class="ds-bars">' +
              m.items
                .map(
                  ([name, v]) =>
                    '<div class="ds-bar"><span>' +
                    esc(name) +
                    '</span><div><i style="width:' +
                    v +
                    '%"></i></div><strong class="ds-num">' +
                    v +
                    '%</strong></div>',
                )
                .join('') +
              '</div>',
            { icon: 'energy' },
          );
        // id 用下标而不是类型：两个同为 line 的小图才不会互相覆盖
        return panel(m.title, m.code, '<svg class="ds-chart" id="ds-mini-' + idx + '"></svg>', {
          icon: m.type === 'bar' ? 'box' : 'chart',
        });
      })
      .join('');
    paintIcons();
    DATA.mini.forEach((m, idx) => {
      if (m.type === 'bar' || m.type === 'line') drawMini(m, idx);
    });
    drawDonuts();
  }

  function drawMini(m, idx) {
    const svg = d3.select('#ds-mini-' + idx);
    const node = svg.node();
    const W = node.clientWidth || 280,
      H = node.clientHeight || 140;
    svg.attr('viewBox', '0 0 ' + W + ' ' + H);
    const m2 = { t: 12, r: 8, b: 18, l: 8 },
      iw = W - m2.l - m2.r,
      ih = H - m2.t - m2.b;
    const max = Math.max(...m.values) * 1.15;
    const x = d3.scaleBand().domain(m.labels).range([m2.l, m2.l + iw]).padding(0.42);
    if (m.type === 'bar') {
      svg
        .selectAll('rect')
        .data(m.values)
        .join('rect')
        .attr('x', (d, i) => x(m.labels[i]))
        .attr('y', (d) => m2.t + ih * (1 - d / max))
        .attr('width', x.bandwidth())
        .attr('height', (d) => ih * (d / max))
        .attr('rx', 2)
        .attr('fill', m.color)
        .attr('opacity', 0.85);
    } else {
      const y = d3.scaleLinear().domain([0, max]).range([m2.t + ih, m2.t]);
      const line = d3
        .line()
        .x((d, i) => x(m.labels[i]) + x.bandwidth() / 2)
        .y((d) => y(d))
        .curve(d3.curveMonotoneX);
      svg
        .append('path')
        .datum(m.values)
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', m.color)
        .attr('stroke-width', 2);
      svg
        .selectAll('circle')
        .data(m.values)
        .join('circle')
        .attr('cx', (d, i) => x(m.labels[i]) + x.bandwidth() / 2)
        .attr('cy', (d) => y(d))
        .attr('r', 2.6)
        .attr('fill', m.color);
    }
    m.labels.forEach((l, i) =>
      svg
        .append('text')
        .attr('x', x(l) + x.bandwidth() / 2)
        .attr('y', H - 4)
        .attr('text-anchor', 'middle')
        .text(l),
    );
  }

  function drawDonuts() {
    donutTargets.forEach(({ id, conf }) => {
      const svg = d3.select('#' + id);
      if (!svg.node()) return;
      const size = 118;
      svg.attr('viewBox', '0 0 ' + size + ' ' + size);
      const arc = d3.arc().innerRadius(38).outerRadius(52).cornerRadius(3).padAngle(0.03);
      const pie = d3.pie().value((d) => d.value).sort(null);
      svg
        .selectAll('path')
        .data(pie(conf.items))
        .join('path')
        .attr('transform', 'translate(' + size / 2 + ',' + size / 2 + ')')
        .attr('d', arc)
        .attr('fill', (d) => d.data.color)
        .attr('opacity', 0.9);
    });
  }

  function renderTicker() {
    const items = DATA.ticker
      .map(([t, text]) => '<span><b>' + esc(t) + '</b>' + esc(text) + '</span>')
      .join('');
    q('#ds-ticker').innerHTML = items + items;
  }

  /* ---------- ④ 交互与生命周期 ---------- */
  const clock = q('#ds-clock');
  function tick() {
    const d = new Date();
    clock.innerHTML =
      esc(d.toLocaleTimeString('zh-CN', { hour12: false })) +
      '<small>' +
      esc(d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', weekday: 'short' })) +
      '</small>';
  }
  tick();
  const clockTimer = setInterval(tick, 1000);

  let period = DATA.main.periods[0].id;
  const toast = q('#ds-toast');
  let toastTimer;
  function notify(text) {
    toast.textContent = text;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast.hidden = true), 2400);
  }
  const dialog = q('#ds-dialog');
  function openDialog(title, body) {
    q('#ds-dialog-title').textContent = title;
    q('#ds-dialog-body').innerHTML = body;
    if (!dialog.open) dialog.showModal();
  }

  stage.addEventListener('click', (event) => {
    const seg = event.target.closest('button[data-period]');
    if (seg) {
      period = seg.dataset.period;
      renderMain(period);
      return;
    }
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'close') return dialog.close();
    if (action === 'fullscreen') {
      (document.fullscreenElement
        ? document.exitFullscreen()
        : document.documentElement.requestFullscreen()
      ).catch(() => notify('当前窗口不支持全屏'));
      return;
    }
    const kpi = event.target.closest('[data-kpi]');
    if (kpi) {
      const k = DATA.kpis[Number(kpi.dataset.kpi)];
      openDialog(
        k.label + ' · 明细',
        '<p>当前值 <b class="ds-num">' +
          num(k.value) +
          k.unit +
          '</b>，较上周期 ' +
          esc(k.delta) +
          '。以下为近 10 个采样点的趋势。</p><div class="ds-facts"><div><span>峰值</span><strong class="ds-num">' +
          num(Math.max(...k.spark)) +
          '</strong></div><div><span>均值</span><strong class="ds-num">' +
          num(Math.round((k.spark.reduce((a, b) => a + b, 0) / k.spark.length) * 10) / 10) +
          '</strong></div></div><p class="ds-note">演示数据，仅用于展示交互与排版。</p>',
      );
    }
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  renderKpis();
  renderColumn('#ds-left', DATA.left);
  renderColumn('#ds-right', DATA.right);
  renderMain(period);
  renderMini();
  renderTicker();
  paintIcons();

  VizLabRuntime.onDispose(() => clearInterval(clockTimer));
})();
