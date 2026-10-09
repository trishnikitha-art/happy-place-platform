import assert from 'node:assert/strict';

/** Opt-in production acceptance using a signed-in CUA tab. No credentials or API bypass. */
export function textPublishingAcceptance(tab, { allowLive = false } = {}) {
  assert.equal(allowLive, true, 'Explicit authorization for a temporary edit and restoration is required');
  const button = name => tab.playwright.getByRole('button', { name, exact: true });
  const state = () => tab.playwright.domSnapshot();
  let original, proposal, stagedId;
  const ids = [];
  async function review() {
    await tab.playwright.getByRole('heading', { name: 'Text transaction review', exact: true }).waitFor({state:'visible',timeoutMs:15000});
    const view = await state();
    stagedId = view.match(/Receipt: (WBDEP-[\d]+-[a-f0-9-]{36})/)?.[1];
    assert.ok(stagedId, 'Immutable transaction receipt is visible');
    assert.ok(view.includes('Expected revision') && view.includes('Target route /'));
    assert.equal(await tab.playwright.locator('[aria-label="Exact character diff"]').count(),1);
    const value = await tab.playwright.getByLabel('Homepage headline',{exact:true}).evaluate(el=>el.value);
    assert.equal(value, proposal);
    return { transactionId: stagedId, view };
  }
  return {
    async initialize() {
      await tab.playwright.getByRole('heading',{name:'Text editor',exact:true}).waitFor({state:'visible',timeoutMs:15000});
      assert.equal(await button('Save to text queue').isEnabled(),false);
      original = await tab.playwright.getByLabel('Homepage headline',{exact:true}).evaluate(el=>el.value);
      assert.ok(original?.endsWith('.'),'Punctuation-only test expects the canonical period');
      return {original,view:await state()};
    },
    async stage({restore=false}={}) {
      proposal = restore ? original : original.slice(0,-1)+'!';
      await tab.playwright.getByLabel('Homepage headline',{exact:true}).fill(proposal);
      await button('Save to text queue').click();
      const result = await review();
      ids.push(result.transactionId);
      assert.ok(await tab.playwright.locator('ins').count());
      assert.ok(await tab.playwright.locator('del').count());
      await tab.reload();
      const recovered = await review();
      assert.equal(recovered.transactionId,result.transactionId,'Reload retains the exact receipt');
      return recovered;
    },
    async recoverFromDashboard() {
      const expected = stagedId;
      await button('Back to transaction dashboard').click();
      await button(`Review transaction ${expected}`).waitFor({state:'visible',timeoutMs:15000});
      await button(`Review transaction ${expected}`).click();
      const recovered = await review();
      assert.equal(recovered.transactionId,expected,'Server dashboard recovers after browser receipt is cleared');
      return recovered;
    },
    async cancel() {
      await button('Cancel staged transaction').click();
      await tab.playwright.getByText('Staged transaction cancelled on the server',{exact:true}).waitFor({state:'visible',timeoutMs:15000});
      const view=await state();
      assert.ok(view.includes('State cancelled'));
      assert.equal(await button('Approve and deploy this text change').count(),0);
      return {transactionId:stagedId,view};
    },
    async dashboard() {
      await button('Back to transaction dashboard').click();
      await tab.playwright.getByRole('heading',{name:'Text transaction dashboard',exact:true}).waitFor({state:'visible',timeoutMs:15000});
      return state();
    },
    async approve() {
      await review();
      const preview=tab.playwright.frameLocator('iframe[title="Actual homepage with staged text"]').getByRole('heading',{name:proposal,exact:true});
      assert.equal(await preview.innerText({timeoutMs:15000}),proposal);
      await button('Approve and deploy this text change').click();
      return {transactionId:stagedId,view:await state()};
    },
    async publication() {
      const view=await state();
      const commitSha=view.match(/Git commit: ([a-f0-9]{40})/)?.[1];
      return {transactionId:stagedId,commitSha,live:view.includes('Live homepage verified'),view};
    },
    async finish() {
      const result=await this.publication();
      assert.ok(result.live,'Restoration must pass commit/deployment/content verification');
      await this.dashboard();
      const view=await state();
      for(const id of ids) {
        const row=tab.playwright.locator('div').filter({has:button(`Review transaction ${id}`)}).filter({hasText:/State: (consumed|cancelled)/});
        assert.ok(await row.count(),`Receipt ${id} must be terminal in the server dashboard`);
      }
      assert.equal(await tab.playwright.getByLabel('Homepage headline',{exact:true}).evaluate(el=>el.value),original);
      assert.ok(!/State: (prepared|committing|committed|failed)/.test(view),'No nonterminal text transaction remains');
      return {original,transactions:ids,restoration:result.commitSha,view};
    },
  };
}
