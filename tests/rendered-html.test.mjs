import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the quality platform dashboard instead of the starter", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /품질 알람 및 관리 통합 플랫폼/);
  assert.match(html, /현황판 개요/);
  assert.match(html, /전체 알람/);
  assert.match(html, /관리대상/);
  assert.doesNotMatch(html, /Your site is taking shape/);
});

test("includes interactive demo controls in the client page", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /CSV 내보내기/);
  assert.match(source, /상태 필터/);
  assert.match(source, /새 규칙 추가/);
  assert.match(source, /신규 케이스 등록/);
});

test("includes complete demo control surfaces", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /알림 센터/);
  assert.match(source, /표시 설정/);
  assert.match(source, /첨부 파일 추가/);
  assert.match(source, /다음 페이지/);
  assert.match(source, /고객지원 센터/);
  assert.match(source, /시스템 로그/);
  assert.match(source, /q-target-rules.csv/);
});
