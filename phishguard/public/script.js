    const state = {
      report: null,
      timeline: [],
      currentScanSource: null,
      currentStreamUrl: null,
      streamWasShown: false,
      scanSucceeded: false
    };

    const healthLabel = document.getElementById('health-label');
    const scanBtn = document.getElementById('scan-btn');
    const resetBtn = document.getElementById('reset-btn');
    const pdfBtn = document.getElementById('export-btn');
    const copyBtn = document.getElementById('copy-btn');
    const statusBar = document.getElementById('status-bar');
    const statusText = document.getElementById('status-text');
    const sourcePill = document.getElementById('source-pill');
    const errorBox = document.getElementById('error-box');
    const resultsEl = document.getElementById('results');

    const streamModal = document.getElementById('stream-modal');
    const streamModalBackdrop = document.getElementById('stream-modal-backdrop');
    const streamModalClose = document.getElementById('stream-modal-close');
    const streamModalFrame = document.getElementById('stream-modal-frame');
    const streamModalEmpty = document.getElementById('stream-modal-empty');

    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    const step3 = document.getElementById('step-3');
    const step4 = document.getElementById('step-4');

    document.addEventListener('DOMContentLoaded', () => {
      checkHealth();
      scanBtn.addEventListener('click', startScan);
      resetBtn.addEventListener('click', resetScan);
      pdfBtn.addEventListener('click', exportJSON);
      copyBtn.addEventListener('click', copyUrl);

      streamModalClose.addEventListener('click', closeStreamModal);
      streamModalBackdrop.addEventListener('click', closeStreamModal);

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeStreamModal();
      });

      document.getElementById('target-url').addEventListener('keydown', (event) => {
        if (event.key === 'Enter') startScan();
      });
    });

    function setStepState(el, stateName) {
      el.className = 'step-chip';
      if (stateName) el.classList.add(stateName);
    }

    function resetSteps() {
      [step1, step2, step3, step4].forEach((el) => setStepState(el, ''));
    }

    async function checkHealth() {
      try {
        const response = await fetch('/api/health');
        const data = await response.json();
        healthLabel.textContent = data.status === 'ok' ? 'Online' : 'Offline';
      } catch {
        healthLabel.textContent = 'Offline';
      }
    }

    function isValidUrl(str) {
      try {
        new URL(str);
        return true;
      } catch {
        return false;
      }
    }

    function normalizeUrl(url) {
      if (!/^https?:\/\//i.test(url)) return `https://${url}`;
      return url;
    }

    function openStreamModal(streamUrl) {
      state.currentStreamUrl = streamUrl || null;
      state.streamWasShown = !!streamUrl;
      streamModal.classList.add('open');
      document.body.style.overflow = 'hidden';

      if (!streamUrl) {
        streamModalFrame.style.display = 'none';
        streamModalFrame.src = '';
        streamModalEmpty.style.display = 'grid';
        streamModalEmpty.textContent = 'TinyFish did not return a live browser stream for this run.';
        return;
      }

      streamModalFrame.src = streamUrl;
      streamModalFrame.style.display = 'block';
      streamModalEmpty.style.display = 'none';
    }

    function closeStreamModal() {
      streamModal.classList.remove('open');
      document.body.style.overflow = '';
      streamModalFrame.style.display = 'none';
      streamModalFrame.src = '';
      streamModalEmpty.style.display = 'grid';
      streamModalEmpty.textContent = 'Waiting for TinyFish live stream…';
    }

    function resetStreamModal() {
      state.currentStreamUrl = null;
      state.streamWasShown = false;
      closeStreamModal();
    }

    function closeExistingSource() {
      if (state.currentScanSource) {
        // Works for both AbortController (fetch) and legacy EventSource
        if (typeof state.currentScanSource.abort === 'function') {
          state.currentScanSource.abort();
        } else if (typeof state.currentScanSource.close === 'function') {
          state.currentScanSource.close();
        }
        state.currentScanSource = null;
      }
    }

    async function startScan() {
      clearError();

      const rawUrl = document.getElementById('target-url').value.trim();
      if (!rawUrl) {
        showError('Enter a URL to scan.');
        return;
      }

      const url = normalizeUrl(rawUrl);
      if (!isValidUrl(url)) {
        showError('Enter a valid URL and include a valid domain name.');
        return;
      }

      closeExistingSource();
      state.scanSucceeded = false;
      resetScan(false);

      document.getElementById('target-url').value = url;
      setLoading(true, 'Starting live scan…');
      sourcePill.textContent = 'Connecting to backend';
      addTimeline('🛰️', 'Live SSE scan requested');
      addTimeline('🌐', `Normalized URL: ${url}`);
      setStepState(step1, 'active');

      const streamUrl = `/api/scan-stream?url=${encodeURIComponent(url)}`;

      // Use fetch + ReadableStream instead of EventSource to prevent auto-reconnect
      const abortController = new AbortController();
      state.currentScanSource = abortController;

      const dispatchSSE = (eventType, dataStr) => {
        const data = safeParseJson(dataStr);
        if (!data) return;

        if (eventType === 'status') {
          statusText.textContent = data.message || 'Starting scan...';

        } else if (eventType === 'progress') {
          statusText.textContent = data.message || 'Working...';
          addTimeline('⚙️', data.message || 'Working...');

        } else if (eventType === 'tinyfish') {
          if (data.type === 'STARTED') {
            sourcePill.textContent = 'TinyFish agent started';
            addTimeline('🤖', `TinyFish run started (${data.run_id || 'unknown'})`);
            setStepState(step1, 'done');
          }
          if (data.type === 'STREAMING_URL') {
            sourcePill.textContent = 'TinyFish live stream active';
            addTimeline('🖥️', 'Live browser stream available');
            setStepState(step2, 'active');
          }
          if (data.type === 'PROGRESS') {
            addTimeline('🧠', data.purpose || 'TinyFish is analyzing the page');
            setStepState(step3, 'active');
          }
          if (data.type === 'COMPLETE') {
            addTimeline('✅', 'TinyFish agent completed');
            if (state.streamWasShown) closeStreamModal();
            setStepState(step1, 'done');
            setStepState(step2, 'done');
            setStepState(step3, 'done');
            setStepState(step4, 'active');
          }

        } else if (eventType === 'stream_url') {
          sourcePill.textContent = 'TinyFish live stream active';
          openStreamModal(data.streaming_url || null);

        } else if (eventType === 'complete') {
          state.scanSucceeded = true;
          state.currentScanSource = null;

          errorBox.style.display = 'none';
          errorBox.textContent = '';

          state.report = data;
          renderAll(data);
          statusText.textContent = 'Scan complete';
          sourcePill.textContent = 'Scan complete';
          addTimeline('📄', 'Backend returned final merged report');
          setStepState(step1, 'done');
          setStepState(step2, 'done');
          setStepState(step3, 'done');
          setStepState(step4, 'done');
          setLoading(false);
          if (state.streamWasShown) closeStreamModal();

        } else if (eventType === 'error') {
          showError(data.message || 'Scan failed.');
          setLoading(false);
          state.currentScanSource = null;
          closeStreamModal();
        }
      };

      (async () => {
        try {
          const res = await fetch(streamUrl, { signal: abortController.signal });
          if (!res.ok || !res.body) throw new Error(`Server error: ${res.status}`);

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let pendingEvent = 'message';
          let pendingData = [];

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Process one line at a time — never split mid-payload
            let newlineIdx;
            while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
              const line = buffer.slice(0, newlineIdx).replace(/\r$/, '');
              buffer = buffer.slice(newlineIdx + 1);

              if (line === '') {
                // Blank line = dispatch accumulated event
                if (pendingData.length) {
                  dispatchSSE(pendingEvent, pendingData.join('\n'));
                }
                pendingEvent = 'message';
                pendingData = [];
              } else if (line.startsWith('event:')) {
                pendingEvent = line.slice(6).trim();
              } else if (line.startsWith('data:')) {
                pendingData.push(line.slice(5).trim());
              }
            }
          }
        } catch (err) {
          if (err.name === 'AbortError' || state.scanSucceeded) return;
          console.error('Scan stream error', err);
          showError('Live scan stream failed.');
          setLoading(false);
          state.currentScanSource = null;
          closeStreamModal();
        }
      })();
    }

    function setLoading(isLoading, text = 'Scanning…') {
      scanBtn.disabled = isLoading;
      pdfBtn.disabled = isLoading;
      copyBtn.disabled = isLoading;
      resetBtn.disabled = isLoading;
      scanBtn.textContent = isLoading ? 'SCANNING...' : 'SCAN TARGET';
      statusBar.style.display = isLoading ? 'flex' : 'none';
      statusText.textContent = text;
      if (isLoading) sourcePill.textContent = 'Collecting evidence';
    }

    function renderAll(payload) {
      resultsEl.style.display = 'block';

      const analysis = payload.tinyfish || {};
      const whois = payload.whois || {};
      const virusTotal = payload.virustotal || {};
      const scannedAt = payload.scanned_at || new Date().toISOString();
      const url = payload.url || '';

      const score =
        typeof payload.risk_score === 'number'
          ? payload.risk_score
          : typeof analysis.risk_score === 'number'
          ? analysis.risk_score
          : 0;

      const verdict =
        String(
          payload.verdict ||
          analysis.verdict ||
          (score >= 70 ? 'PHISHING' : score >= 40 ? 'SUSPICIOUS' : 'SAFE')
        ).toUpperCase();

      renderSummaryStrip(payload, analysis, virusTotal, verdict);
      renderScore(score, verdict);
      renderBadges(analysis, whois, virusTotal, payload.threat_signals || []);
      renderWhois(whois);
      renderVT(virusTotal);
      renderBrand(payload.brand_impersonation || analysis.brand_impersonation || [], payload.threat_signals || analysis.threat_signals || []);
      renderRedirects(payload.redirects || analysis.redirects || []);
      renderTimelineCard(scannedAt, url, analysis, whois, virusTotal, payload.summary || analysis.summary || '');
    }

    function renderSummaryStrip(payload, analysis, virusTotal, verdict) {
      document.getElementById('summary-verdict').textContent = verdict;
      document.getElementById('summary-domain').textContent = payload.domain || analysis.domain || 'Unknown';
      document.getElementById('summary-final-url').textContent = payload.final_url || analysis.final_url || payload.url || 'Unknown';
      const vtFlags = Number(virusTotal?.stats?.malicious || 0) + Number(virusTotal?.stats?.suspicious || 0);
      document.getElementById('summary-vt').textContent = virusTotal?.stats ? `${vtFlags} flagged` : 'No data';
      document.getElementById('summary-stream').textContent = state.streamWasShown ? 'Completed' : 'No live stream';
    }

    function renderScore(score, verdict) {
      const scoreValue = document.getElementById('score-value');
      const verdictEl = document.getElementById('verdict');

      scoreValue.textContent = String(score);
      const gaugeFill = document.getElementById('gauge-fill');
      const total = 276.5;
      const offset = total - (Math.max(0, Math.min(score, 100)) / 100) * total;
      if (gaugeFill) gaugeFill.style.strokeDashoffset = offset;
      scoreValue.style.color =
        verdict === 'PHISHING'
          ? 'var(--red)'
          : verdict === 'SAFE'
          ? 'var(--green)'
          : 'var(--yellow)';

      verdictEl.textContent =
        verdict === 'PHISHING'
          ? 'PHISHING DETECTED'
          : verdict === 'SAFE'
          ? 'SAFE'
          : 'SUSPICIOUS';

      verdictEl.className = `verdict ${
        verdict === 'PHISHING'
          ? 'phishing'
          : verdict === 'SAFE'
          ? 'safe'
          : 'suspicious'
      }`;
    }

    function renderBadges(analysis, whois, virusTotal, threatSignals) {
      const badges = [];
      const signals = Array.isArray(threatSignals) && threatSignals.length
        ? threatSignals
        : Array.isArray(analysis.threat_signals)
        ? analysis.threat_signals
        : [];

      const ageDays = whois?.age_days;
      const vtFlags =
        Number(virusTotal?.stats?.malicious || 0) +
        Number(virusTotal?.stats?.suspicious || 0);

      signals.forEach((signal) => {
        if (typeof signal === 'string') {
          badges.push({ label: signal, severity: 'low' });
        } else if (signal?.label) {
          badges.push({ label: signal.label, severity: signal.severity || 'low' });
        }
      });

      if (analysis.uses_ssl === true) {
        badges.push({ label: 'HTTPS present', severity: 'clear' });
      }

      if (typeof ageDays === 'number' && ageDays < 30) {
        badges.push({ label: 'Domain younger than 30 days', severity: 'high' });
      }

      if (typeof ageDays === 'number' && ageDays >= 30 && ageDays < 180) {
        badges.push({ label: 'Domain younger than 6 months', severity: 'medium' });
      }

      if (vtFlags > 0) {
        badges.push({
          label: `VirusTotal flagged by ${vtFlags} engine(s)`,
          severity: vtFlags >= 3 ? 'high' : 'medium'
        });
      }

      const grid = document.getElementById('badge-grid');
      const seen = new Set();
      grid.innerHTML = '';

      if (badges.length === 0) {
        grid.innerHTML = '<span class="muted small">No indicators found.</span>';
        return;
      }

      badges.forEach((badge) => {
        const key = `${badge.label}|${badge.severity}`;
        if (seen.has(key)) return;
        seen.add(key);

        const el = document.createElement('span');
        el.className = `badge ${badge.severity}`;
        el.textContent = badge.label;
        grid.appendChild(el);
      });
    }

    function renderWhois(whois) {
      const table = document.getElementById('whois-table');

      const rows = [
        ['Domain', whois?.domain || 'Unknown'],
        ['Registrar', whois?.registrar || 'Unknown'],
        ['Country', whois?.country || 'Unknown'],
        ['Created', formatDate(whois?.created)],
        ['Expires', formatDate(whois?.expires)],
        ['Domain Age', typeof whois?.age_days === 'number' ? `${whois.age_days} days` : 'Unknown'],
        ['Status', Array.isArray(whois?.status) && whois.status.length ? whois.status.join(', ') : 'Unknown'],
        ['Source', whois?.source || 'Unknown']
      ];

      table.innerHTML = rows
        .map(([key, value]) => `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(String(value))}</td></tr>`)
        .join('');
    }

    function renderVT(vt) {
      const summary = document.getElementById('vt-summary');
      const engines = document.getElementById('vt-engines');
      engines.innerHTML = '';

      if (!vt) {
        summary.textContent = 'VirusTotal not configured or no results returned.';
        document.getElementById('vt-malicious').textContent = '0';
        document.getElementById('vt-suspicious').textContent = '0';
        document.getElementById('vt-clean').textContent = '0';
        document.getElementById('vt-total').textContent = '0';
        return;
      }

      if (vt?.error) {
        summary.textContent = `VirusTotal error: ${vt.error}`;
        document.getElementById('vt-malicious').textContent = '0';
        document.getElementById('vt-suspicious').textContent = '0';
        document.getElementById('vt-clean').textContent = '0';
        document.getElementById('vt-total').textContent = '0';
        return;
      }

      const stats = vt.stats || {};
      const maliciousEl = document.getElementById('vt-malicious');
      const suspiciousEl = document.getElementById('vt-suspicious');
      const cleanEl = document.getElementById('vt-clean');
      const totalEl = document.getElementById('vt-total');
      const malicious = Number(stats.malicious || 0);
      const suspicious = Number(stats.suspicious || 0);
      const clean = Number(stats.harmless || 0) + Number(stats.undetected || 0);
      const flagged = malicious + suspicious;
      const total = flagged + clean + Number(stats.timeout || 0);
      maliciousEl.textContent = String(malicious);
      suspiciousEl.textContent = String(suspicious);
      cleanEl.textContent = String(clean);
      totalEl.textContent = String(total);

      summary.innerHTML = `Flagged: <strong style="color:${flagged ? 'var(--red)' : 'var(--green)'}">${flagged}</strong> / ${total || 0} engines`;

      const results = Object.entries(vt.results || {});
      const prioritized = results
        .sort((a, b) => severityRank(a[1]?.category) - severityRank(b[1]?.category))
        .slice(0, 12);

      if (prioritized.length === 0) {
        engines.innerHTML = '<div class="muted small">No engine-level results returned.</div>';
        return;
      }

      prioritized.forEach(([name, result]) => {
        const cat = result?.category || 'undetected';
        const row = document.createElement('div');
        row.className = 'engine-item';
        row.innerHTML = `
          <div class="engine-name">${escapeHtml(name)}</div>
          <div class="engine-result ${cat === 'malicious' || cat === 'suspicious' ? 'bad' : 'ok'}">
            ${escapeHtml(result?.result || cat)}
          </div>
        `;
        engines.appendChild(row);
      });
    }

    function renderBrand(brands) {
      const box = document.getElementById('brand-box');

      if (!Array.isArray(brands) || brands.length === 0) {
        box.innerHTML = '<div class="muted small">No brand impersonation evidence returned.</div>';
        return;
      }

      box.innerHTML = brands.slice(0, 6).map((brand) => {
        const similarity = Number(brand.similarity || 0);
        const color =
          similarity >= 70 ? 'var(--red)'
          : similarity >= 40 ? 'var(--orange)'
          : 'var(--yellow)';

        return `
          <div class="brand-item">
            <div>${escapeHtml(brand.brand || 'Unknown')}</div>
            <div class="bar"><span style="width:${similarity}%; background:${color}"></span></div>
            <div class="mono">${similarity}%</div>
          </div>
        `;
      }).join('');
    }

    function renderRedirects(redirects) {
      const container = document.getElementById('redirects');
      const hops = Array.isArray(redirects) && redirects.length ? redirects : ['No redirect data'];

      container.innerHTML = hops
        .map((hop) => `<span class="hop" title="${escapeHtml(hop)}">${escapeHtml(extractDomain(hop) || hop)}</span>`)
        .join('');
    }

    function renderTimelineCard(scannedAt, url, analysis, whois, vt, summaryText) {
      const entries = [];
      entries.push([scannedAt, `Target: ${url}`]);
      entries.push([scannedAt, `Final URL: ${analysis.final_url || url}`]);

      if (typeof whois?.age_days === 'number') {
        entries.push([scannedAt, `WHOIS age: ${whois.age_days} day(s)`]);
      }

      if (analysis.has_login_form) {
        entries.push([scannedAt, 'Login or credential form detected']);
      }

      if (analysis.urgency_language) {
        entries.push([scannedAt, 'Urgency language reported']);
      }

      if (analysis.uses_ssl === false) {
        entries.push([scannedAt, 'URL does not use HTTPS']);
      }

      const vtFlags = Number(vt?.stats?.malicious || 0) + Number(vt?.stats?.suspicious || 0);
      if (vt?.stats) {
        entries.push([scannedAt, vtFlags ? `VirusTotal flagged by ${vtFlags} engine(s)` : 'VirusTotal returned no flags']);
      }

      if (summaryText) {
        entries.push([scannedAt, summaryText]);
      }

      const timelineEl = document.getElementById('timeline');
      timelineEl.innerHTML = entries.map(([time, message]) => `
        <div class="tl-row">
          <div class="tl-icon">•</div>
          <div class="tl-body">
            <div class="tl-time">${escapeHtml(formatDateTime(time))}</div>
            <div>${escapeHtml(message)}</div>
          </div>
        </div>
      `).join('');
    }

    function addTimeline(icon, message) {
      state.timeline.push({ icon, message, time: new Date().toISOString() });
    }

    function resetScan(clearInput = true) {
      state.report = null;
      state.timeline = [];
      closeExistingSource();

      if (clearInput) {
        document.getElementById('target-url').value = '';
      }

      document.getElementById('badge-grid').innerHTML = '';
      document.getElementById('whois-table').innerHTML = '';
      document.getElementById('vt-summary').textContent = 'No scan yet.';
      document.getElementById('vt-engines').innerHTML = '';
      document.getElementById('brand-box').innerHTML = '<div class="muted small">No scan yet.</div>';
      document.getElementById('redirects').innerHTML = '';
      document.getElementById('timeline').innerHTML = '';
      document.getElementById('score-value').textContent = '0';
      document.getElementById('score-value').style.color = 'var(--text)';
      document.getElementById('verdict').textContent = 'Pending';
      document.getElementById('verdict').className = 'verdict suspicious';
      document.getElementById('summary-verdict').textContent = '—';
      document.getElementById('summary-domain').textContent = '—';
      document.getElementById('summary-final-url').textContent = '—';
      document.getElementById('summary-vt').textContent = '—';
      document.getElementById('summary-stream').textContent = '—';
      resultsEl.style.display = 'none';
      setLoading(false);
      clearError();
      resetStreamModal();
      resetSteps();
    }

    async function copyUrl() {
      const input = document.getElementById('target-url');
      const url = input.value.trim();

      if (!url) {
        showError('Enter or scan a URL first before copying.');
        return;
      }

      try {
        await navigator.clipboard.writeText(url);
        sourcePill.textContent = 'URL copied to clipboard';
      } catch {
        showError('Copy failed in this browser.');
      }
    }

    function showError(message) {
      errorBox.style.display = 'block';
      errorBox.textContent = message;
    }

    function clearError() {
      errorBox.style.display = 'none';
      errorBox.textContent = '';
    }

    function severityRank(category) {
      if (category === 'malicious') return 0;
      if (category === 'suspicious') return 1;
      if (category === 'harmless') return 2;
      return 3;
    }

    function extractDomain(value) {
      try { return new URL(value).hostname; } catch { return value; }
    }

    function formatDate(value) {
      if (!value) return 'Unknown';
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? 'Unknown' : d.toLocaleDateString();
    }

    function formatDateTime(value) {
      if (!value) return 'Unknown';
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? 'Unknown' : d.toLocaleString();
    }

    function escapeHtml(value) {
      return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    }

    function safeParseJson(text) {
      try { return JSON.parse(text); } catch { return null; }
    }

    function exportJSON() {
      if (!state.report) {
        showError('Run a scan first before exporting a JSON report.');
        return;
      }

      const report = state.report;
      const analysis = report.tinyfish || {};
      const whois = report.whois || {};
      const vt = report.virustotal || {};
      const vtStats = vt.stats || {};

      const exportData = {
        exported_at: new Date().toISOString(),
        scanned_at: report.scanned_at || null,
        url: report.url || null,
        domain: report.domain || null,
        verdict: report.verdict || analysis.verdict || null,
        risk_score: report.risk_score ?? analysis.risk_score ?? null,
        summary: report.summary || analysis.summary || null,
        threat_signals: Array.isArray(report.threat_signals) ? report.threat_signals : [],
        redirects: Array.isArray(report.redirects) ? report.redirects : [],
        whois: {
          domain: whois.domain || null,
          registrar: whois.registrar || null,
          country: whois.country || null,
          created: whois.created || null,
          expires: whois.expires || null,
          age_days: typeof whois.age_days === 'number' ? whois.age_days : null
        },
        virustotal: vt.error
          ? { error: vt.error }
          : {
              malicious: vtStats.malicious ?? null,
              suspicious: vtStats.suspicious ?? null,
              harmless: vtStats.harmless ?? null,
              undetected: vtStats.undetected ?? null
            },
        raw: report
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `phishguard-report-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
