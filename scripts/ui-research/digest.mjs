export function formatDigest(result, allEvents) {
  const events = allEvents.filter(e => e.at <= result.at);
  const observations = events.filter(e => e.type === 'observation' && e.runId === result.runId);
  const latest = new Map(), decisions = new Map();
  for (const event of events) {
    for (const finding of event.findings ?? []) if (!finding.duplicateOf) latest.set(finding.findingId, finding);
    if (event.type === 'decision') decisions.set(event.findingId + ':' + event.versionId, event);
  }
  const escape = text => String(text).replace(/[|\r\n]/g, ' ');
  const lines = ['# HPP UI research — ' + result.runId, '', '**' + result.status.toUpperCase() + '** · ' + result.at, '',
    `${result.counts.retrieved}/${result.counts.sources} sources retrieved; ${result.counts.newVersions} new versions; ${result.counts.duplicates} unchanged findings; ${result.counts.failed} failures.`, '',
    '## Source evidence', '', '| Source | Retrieval | Evidence |', '| --- | --- | --- |'];
  for (const event of observations) lines.push('| ' + escape(event.sourceId) + ' | ' + event.status + ' | '
    + (event.status === 'failed' ? escape(event.error) : '[' + event.evidence.contentHash.slice(0, 12) + '](' + event.url + ')') + ' |');
  lines.push('', '## Ranked review candidates', '', '| Score | Candidate | Current HPP target | Review |', '| --- | --- | --- | --- |');
  for (const finding of [...latest.values()].sort((a, b) => b.score - a.score)) {
    const decision = decisions.get(finding.findingId + ':' + finding.versionId);
    lines.push('| ' + finding.score + ' | ' + escape(finding.description) + ' | ' + escape(finding.targets[0].path)
      + ':' + finding.targets[0].line + ' | ' + (decision?.decision ?? finding.reviewStatus) + ' |');
  }
  lines.push('', 'Scores are curated triage estimates. Text evidence does not prove source layout or interaction. Recommendations need human review; a decision never authorizes publication.', '',
    'PING: **BLOCKED** pending a verified authenticated research-reference contract.', '',
    '## Run receipt', '', '```json', JSON.stringify(result, null, 2), '```', '');
  return lines.join('\n');
}
