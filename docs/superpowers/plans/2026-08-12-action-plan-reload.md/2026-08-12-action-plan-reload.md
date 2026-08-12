# 조치계획 새로고침 복원 Implementation Plan

**Goal:** 새로고침 후 관리대상의 조치계획 팝업을 열면 마지막으로 저장한 조치계획과 과제를 즉시 표시한다.

**Architecture:** 관리대상 조치계획 열기 흐름은 API 조회를 완료한 뒤에만 팝업 상태를 활성화한다. 조회된 최신 계획은 기존 `persistedActionPlan`과 `tasks` 상태에 저장된다.

## 검증

- 관리대상 조치계획은 `await reloadActionPlan({ targetId: target.id })` 이후에만 팝업을 연다.
- 전체 기존 테스트와 빌드를 실행한다.
