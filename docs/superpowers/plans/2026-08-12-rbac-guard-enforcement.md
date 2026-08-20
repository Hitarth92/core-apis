# RBAC Guard Enforcement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every unauthenticated / unrestricted controller found by the RBAC audit of `core-apis` (2026-08-12), so that every HTTP endpoint requires a valid Clerk session, and every endpoint that mutates organization-structural, financial, or role data requires the correct `ERole` tier.

**Architecture:** All fixes reuse the guard/decorator pair that already exists and is already proven in this codebase (`ClerkAuthGuard`, `RolesGuard`, `@Roles(...ERole)` — see `src/application/modules/bills/bills.controller.ts` and the `POST /auth/invite` handler in `src/application/modules/auth/auth.controller.ts`). No new guard, decorator, or auth mechanism is introduced. Class-level `@UseGuards(ClerkAuthGuard)` is added to every controller that currently has none, gating every route on that controller behind a valid session. Individual mutating endpoints that need role restriction get an additional method-level `@UseGuards(RolesGuard)` + `@Roles(...)`.

**Tech Stack:** NestJS (CQRS, `@nestjs/passport`), TypeScript, Jest + ts-jest.

## Global Constraints

- Guard pattern must match the two existing precedents exactly: class-level `@UseGuards(ClerkAuthGuard)` (or `@UseGuards(ClerkAuthGuard, RolesGuard)` when every mutating route on the controller needs role checks — see `bills.controller.ts:32`), method-level `@UseGuards(RolesGuard)` + `@Roles(ERole.X, ERole.Y)` only on the specific routes that need elevation (see `auth.controller.ts:147-148`).
- `RolesGuard` (`src/common/auth/guards/roles.guard.ts`) already treats "no `@Roles` metadata" as "any authenticated role passes" — do not add empty `@Roles()` calls, just omit the decorator where no restriction is needed.
- **Runtime import of any controller in Jest is currently broken.** Every controller imports `Mapper` from `@automapper/core`, which ships ESM-only (`@automapper/core/index.mjs`) and is not covered by this repo's `ts-jest` transform (`package.json` `jest.transform` only matches `.(t|j)s$`, and Jest's default `transformIgnorePatterns` excludes `node_modules` entirely). Verified this session: importing `UserRolesController` directly in a `.spec.ts` fails with `SyntaxError: Unexpected token 'export'` at the `@automapper/core` import. This is why the only two existing spec files in the repo (`numeric.transformer.spec.ts`, `bill-totals.spec.ts`) explicitly avoid importing anything that pulls in `@automapper/classes`/`@automapper/core` (see the comment at the top of `bill-totals.spec.ts`). Fixing Jest's ESM handling is out of scope for this plan — it's a separate, riskier infra change with its own blast radius across every future spec. **All tests in this plan read controller source files as text and assert on the decorator source, not on the imported class.** This is a static regression check (fails if the decorator line is deleted or reverted), not a request-level behavioral test — that gap is called out explicitly in Task 7.
- No `test/jest-e2e.json` exists in this repo (the `test:e2e` npm script currently points at a missing file) — there is no request-level (supertest) test harness to hook into. Do not invent one as part of this plan.
- Every new/changed decorator import must come from the existing barrels (`'../../../common'` for `ClerkAuthGuard`/`RolesGuard`/`Roles`, `'../../../infrastructure'` for `ERole`) — matches this repo's barrel-import convention seen in every controller already read.
- Role tiers used throughout (inline, no new shared constant — matches the existing inline `@Roles(ERole.OrgAdmin, ERole.SuperAdmin)` style in `auth.controller.ts`):
  - **Platform tier** — `ERole.SuperAdmin` only. For operations that create/alter tenant-structural or platform-wide data (organizations, platform configurations, role definitions).
  - **Org-admin tier** — `ERole.OrgAdmin, ERole.SuperAdmin`. For operations that alter who has access within an org, or retroactively alter financial records.
  - **Manager tier** — `ERole.StoreManager, ERole.OrgManager, ERole.OrgAdmin, ERole.SuperAdmin`. For destructive or approval operations on routine store/org data (deletes, expense approval) — excludes only `StoreStaff`.

---

## File Structure

New file:
- `src/common/auth/rbac-guard-coverage.spec.ts` — single spec file, grows across every task in this plan. Reads controller source files as text and asserts guard/role decorators are present at the class and method level. This is the "one file" test surface for the whole plan — every task adds a `describe` block here, nothing else.

Modified files (11 controllers with zero guards, 5 controllers needing one elevated `@Roles` added to an existing `@UseGuards(ClerkAuthGuard)`, 2 files with an already-pending uncommitted fix to commit):
- `src/application/modules/user-roles/user-roles.controller.ts`
- `src/application/modules/roles/roles.controller.ts`
- `src/application/modules/organizations/organizations.controller.ts`
- `src/application/modules/payment-transactions/payment-transactions.controller.ts`
- `src/application/modules/platform-configurations/platform-configurations.controller.ts`
- `src/application/modules/expenses/expenses.controller.ts`
- `src/application/modules/item-returns/item-returns.controller.ts`
- `src/application/modules/report-generation-logs/report-generation-logs.controller.ts`
- `src/application/modules/purchase-items/purchase-items.controller.ts`
- `src/application/modules/activity-logs/activity-logs.controller.ts`
- `src/application/modules/orders/orders.controller.ts`
- `src/application/modules/customers/customers.controller.ts`
- `src/application/modules/drivers/drivers.controller.ts`
- `src/application/modules/trips/trips.controller.ts`
- `src/application/modules/vehicle-expenses/vehicle-expenses.controller.ts`
- `src/application/modules/vehicles/vehicles.controller.ts`
- `src/application/modules/invoices/invoices.controller.ts` (already modified, uncommitted)
- `src/common/auth/strategies/clerk-jwt.strategy.ts` (already modified, uncommitted)

No file is deleted. No new guard/decorator/module is created — everything reuses `ClerkAuthGuard`, `RolesGuard`, `Roles`, `ERole`.

---

## Task 1: Build and prove the source-level guard-coverage checker

**Files:**
- Create: `src/common/auth/rbac-guard-coverage.spec.ts`

**Interfaces:**
- Produces (used by every later task in this plan):
  - `readController(relativePath: string): string` — reads a controller file's full source as UTF-8 text. `relativePath` is relative to `src/application/modules`, e.g. `'bills/bills.controller.ts'`.
  - `hasClassGuard(source: string, guard: string): boolean` — true if the `@UseGuards(...)` immediately preceding the `@Controller(` line lists `guard`.
  - `methodDecorators(source: string, methodName: string): string` — the raw decorator block immediately preceding `public async <methodName>(`.
  - `hasMethodGuard(decorators: string, guard: string): boolean` — true if a `@UseGuards(...)` in the block lists `guard`.
  - `methodRoles(decorators: string): string[]` — the trimmed contents of `@Roles(...)` in the block, or `[]` if absent.

This task proves the checker against two controllers that are **already correctly guarded** (`bills.controller.ts`, `auth.controller.ts`) — this is not a red/green fix cycle, it's validating the tool itself against known-true facts before every other task depends on it.

- [ ] **Step 1: Write the checker and the proving spec together**

```typescript
// src/common/auth/rbac-guard-coverage.spec.ts
import { readFileSync } from 'fs';
import { join } from 'path';

const MODULES_ROOT = join(__dirname, '../../application/modules');

function readController(relativePath: string): string {
  return readFileSync(join(MODULES_ROOT, relativePath), 'utf8');
}

function hasClassGuard(source: string, guard: string): boolean {
  const match = source.match(/@UseGuards\(([^)]*)\)\s*\n@Controller\(/);
  if (!match) {
    return false;
  }
  return match[1].split(',').map((entry) => entry.trim()).includes(guard);
}

function methodDecorators(source: string, methodName: string): string {
  const pattern = new RegExp(`((?:@[A-Za-z]+\\([^)]*\\)\\s*\\n)+)\\s*public async ${methodName}\\(`);
  const match = source.match(pattern);
  if (!match) {
    throw new Error(`method "${methodName}" not found in controller source`);
  }
  return match[1];
}

function hasMethodGuard(decorators: string, guard: string): boolean {
  const match = decorators.match(/@UseGuards\(([^)]*)\)/);
  if (!match) {
    return false;
  }
  return match[1].split(',').map((entry) => entry.trim()).includes(guard);
}

function methodRoles(decorators: string): string[] {
  const match = decorators.match(/@Roles\(([^)]*)\)/);
  if (!match) {
    return [];
  }
  return match[1].split(',').map((entry) => entry.trim()).filter((entry) => entry.length > 0);
}

describe('rbac guard coverage checker (proving against already-guarded controllers)', () => {
  it('detects the class-level guard chain on BillsController', () => {
    const source = readController('bills/bills.controller.ts');
    expect(hasClassGuard(source, 'ClerkAuthGuard')).toBe(true);
    expect(hasClassGuard(source, 'RolesGuard')).toBe(true);
  });

  it('detects the method-level role restriction on AuthController.inviteMember', () => {
    const source = readController('auth/auth.controller.ts');
    const decorators = methodDecorators(source, 'inviteMember');
    expect(hasMethodGuard(decorators, 'RolesGuard')).toBe(true);
    expect(methodRoles(decorators)).toEqual(['ERole.OrgAdmin', 'ERole.SuperAdmin']);
  });

  it('reports no class-level RolesGuard on AuthController itself (class only has ClerkAuthGuard)', () => {
    const source = readController('auth/auth.controller.ts');
    expect(hasClassGuard(source, 'ClerkAuthGuard')).toBe(true);
    expect(hasClassGuard(source, 'RolesGuard')).toBe(false);
  });
});
```

- [ ] **Step 2: Run the spec and confirm all three assertions pass immediately**

Run: `npm test -- rbac-guard-coverage`
Expected: `Tests: 3 passed, 3 total`. If any assertion fails, the regex in the checker is wrong — fix the checker, not the (already-correct) reference controllers, and re-run before continuing to any later task.

- [ ] **Step 3: Commit**

```bash
git add src/common/auth/rbac-guard-coverage.spec.ts
git commit -m "test: add source-level RBAC guard coverage checker"
```

---

## Task 2: Guard the two privilege-escalation endpoints (user-roles, roles)

**Files:**
- Modify: `src/application/modules/user-roles/user-roles.controller.ts`
- Modify: `src/application/modules/roles/roles.controller.ts`
- Modify: `src/common/auth/rbac-guard-coverage.spec.ts`

- [ ] **Step 1: Add the failing coverage assertions**

Append to `src/common/auth/rbac-guard-coverage.spec.ts`:

```typescript
describe('user-roles controller', () => {
  const source = () => readController('user-roles/user-roles.controller.ts');

  it('requires Clerk authentication on the whole controller', () => {
    expect(hasClassGuard(source(), 'ClerkAuthGuard')).toBe(true);
  });

  it('restricts assigning a role to a user to org-admin tier', () => {
    const decorators = methodDecorators(source(), 'create');
    expect(hasMethodGuard(decorators, 'RolesGuard')).toBe(true);
    expect(methodRoles(decorators)).toEqual(['ERole.OrgAdmin', 'ERole.SuperAdmin']);
  });
});

describe('roles controller', () => {
  const source = () => readController('roles/roles.controller.ts');

  it('requires Clerk authentication on the whole controller', () => {
    expect(hasClassGuard(source(), 'ClerkAuthGuard')).toBe(true);
  });

  it('restricts defining a new role to platform tier', () => {
    const decorators = methodDecorators(source(), 'create');
    expect(hasMethodGuard(decorators, 'RolesGuard')).toBe(true);
    expect(methodRoles(decorators)).toEqual(['ERole.SuperAdmin']);
  });
});
```

- [ ] **Step 2: Run and confirm the new assertions fail**

Run: `npm test -- rbac-guard-coverage`
Expected: the two new `describe` blocks fail — `hasClassGuard` returns `false` (no `@UseGuards` exists yet on either controller) and `methodDecorators('create')` finds the method but `hasMethodGuard` returns `false`.

- [ ] **Step 3: Guard `user-roles.controller.ts`**

Change the import on line 3 from:
```typescript
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
```
to:
```typescript
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
```

Change the import on line 6 from:
```typescript
import { CqrsMediator } from '../../../common';
```
to:
```typescript
import { ClerkAuthGuard, CqrsMediator, RolesGuard, Roles } from '../../../common';
```

Add after line 6:
```typescript
import { ERole } from '../../../infrastructure';
```

Change:
```typescript
@ApiBearerAuth()
@ApiTags('UserRoles')
@Controller({ path: 'user-roles', version: '1' })
export class UserRolesController {
```
to:
```typescript
@ApiBearerAuth()
@ApiTags('UserRoles')
@UseGuards(ClerkAuthGuard)
@Controller({ path: 'user-roles', version: '1' })
export class UserRolesController {
```

Change:
```typescript
  @ApiOperation({ summary: 'Create a new user role association' })
  @ApiCreatedResponse({ type: UserRoleResponse })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  public async create(@Body() body: CreateUserRoleRequest): Promise<UserRoleResponse> {
```
to:
```typescript
  @ApiOperation({ summary: 'Create a new user role association' })
  @ApiCreatedResponse({ type: UserRoleResponse })
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles(ERole.OrgAdmin, ERole.SuperAdmin)
  @Post()
  public async create(@Body() body: CreateUserRoleRequest): Promise<UserRoleResponse> {
```

- [ ] **Step 4: Guard `roles.controller.ts`**

Change the import on line 3 from:
```typescript
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
```
to:
```typescript
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
```

Change the import on line 6 from:
```typescript
import { CqrsMediator } from '../../../common';
```
to:
```typescript
import { ClerkAuthGuard, CqrsMediator, RolesGuard, Roles } from '../../../common';
```

Add after line 6:
```typescript
import { ERole } from '../../../infrastructure';
```

Change:
```typescript
@ApiBearerAuth()
@ApiTags('Roles')
@Controller({ path: 'roles', version: '1' })
export class RolesController {
```
to:
```typescript
@ApiBearerAuth()
@ApiTags('Roles')
@UseGuards(ClerkAuthGuard)
@Controller({ path: 'roles', version: '1' })
export class RolesController {
```

Change:
```typescript
  @ApiOperation({ summary: 'Create a new role' })
  @ApiCreatedResponse({ type: RoleResponse })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  public async create(@Body() body: CreateRoleRequest): Promise<RoleResponse> {
```
to:
```typescript
  @ApiOperation({ summary: 'Create a new role' })
  @ApiCreatedResponse({ type: RoleResponse })
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles(ERole.SuperAdmin)
  @Post()
  public async create(@Body() body: CreateRoleRequest): Promise<RoleResponse> {
```

- [ ] **Step 5: Run and confirm all coverage assertions pass**

Run: `npm test -- rbac-guard-coverage`
Expected: `Tests: 9 passed, 9 total` (3 from Task 1 + 6 new).

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors from either controller.

- [ ] **Step 7: Commit**

```bash
git add src/application/modules/user-roles/user-roles.controller.ts \
        src/application/modules/roles/roles.controller.ts \
        src/common/auth/rbac-guard-coverage.spec.ts
git commit -m "fix: close open privilege-escalation hole in user-roles and roles controllers"
```

---

## Task 3: Guard organizations and payment-transactions controllers

**Files:**
- Modify: `src/application/modules/organizations/organizations.controller.ts`
- Modify: `src/application/modules/payment-transactions/payment-transactions.controller.ts`
- Modify: `src/common/auth/rbac-guard-coverage.spec.ts`

- [ ] **Step 1: Add the failing coverage assertions**

Append to `src/common/auth/rbac-guard-coverage.spec.ts`:

```typescript
describe('organizations controller', () => {
  const source = () => readController('organizations/organizations.controller.ts');

  it('requires Clerk authentication on the whole controller', () => {
    expect(hasClassGuard(source(), 'ClerkAuthGuard')).toBe(true);
  });

  it.each(['create', 'update', 'delete'])('restricts %s to platform tier', (method) => {
    const decorators = methodDecorators(source(), method);
    expect(hasMethodGuard(decorators, 'RolesGuard')).toBe(true);
    expect(methodRoles(decorators)).toEqual(['ERole.SuperAdmin']);
  });
});

describe('payment-transactions controller', () => {
  const source = () => readController('payment-transactions/payment-transactions.controller.ts');

  it('requires Clerk authentication on the whole controller', () => {
    expect(hasClassGuard(source(), 'ClerkAuthGuard')).toBe(true);
  });

  it.each(['update', 'delete'])('restricts %s to org-admin tier', (method) => {
    const decorators = methodDecorators(source(), method);
    expect(hasMethodGuard(decorators, 'RolesGuard')).toBe(true);
    expect(methodRoles(decorators)).toEqual(['ERole.OrgAdmin', 'ERole.SuperAdmin']);
  });

  it('leaves create unrestricted beyond authentication (routine POS write)', () => {
    const decorators = methodDecorators(source(), 'create');
    expect(hasMethodGuard(decorators, 'RolesGuard')).toBe(false);
  });
});
```

- [ ] **Step 2: Run and confirm the new assertions fail**

Run: `npm test -- rbac-guard-coverage`
Expected: every new `it`/`it.each` in the two new `describe` blocks fails except `'leaves create unrestricted...'` (which is already true — no guard exists yet at all — so note it passes vacuously today and stays true after Step 3).

- [ ] **Step 3: Guard `organizations.controller.ts`**

Change the import on line 3 from:
```typescript
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query } from '@nestjs/common';
```
to:
```typescript
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
```

Change line 6 from:
```typescript
import { CqrsMediator } from '../../../common';
```
to:
```typescript
import { ClerkAuthGuard, CqrsMediator, RolesGuard, Roles } from '../../../common';
```

Add after the `IPageable` import (line 7):
```typescript
import { ERole } from '../../../infrastructure';
```

Change:
```typescript
@ApiBearerAuth()
@ApiTags('Organizations')
@Controller({ path: 'organizations', version: '1' })
export class OrganizationsController {
```
to:
```typescript
@ApiBearerAuth()
@ApiTags('Organizations')
@UseGuards(ClerkAuthGuard)
@Controller({ path: 'organizations', version: '1' })
export class OrganizationsController {
```

Change:
```typescript
  @ApiOperation({ summary: 'Create a new organization' })
  @ApiCreatedResponse({ type: OrganizationResponse })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  public async create(@Body() body: CreateOrganizationRequest): Promise<OrganizationResponse> {
```
to:
```typescript
  @ApiOperation({ summary: 'Create a new organization' })
  @ApiCreatedResponse({ type: OrganizationResponse })
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles(ERole.SuperAdmin)
  @Post()
  public async create(@Body() body: CreateOrganizationRequest): Promise<OrganizationResponse> {
```

Change:
```typescript
  @ApiOperation({ summary: 'Update a organization' })
  @ApiOkResponse({ type: OrganizationResponse })
  @ApiParam({ name: 'id', description: 'Organization UUID' })
  @HttpCode(HttpStatus.OK)
  @Put(':id')
  public async update(@Param('id') id: string, @Body() body: UpdateOrganizationRequest): Promise<OrganizationResponse> {
```
to:
```typescript
  @ApiOperation({ summary: 'Update a organization' })
  @ApiOkResponse({ type: OrganizationResponse })
  @ApiParam({ name: 'id', description: 'Organization UUID' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(ERole.SuperAdmin)
  @Put(':id')
  public async update(@Param('id') id: string, @Body() body: UpdateOrganizationRequest): Promise<OrganizationResponse> {
```

Change:
```typescript
  @ApiOperation({ summary: 'Delete a organization' })
  @ApiOkResponse({ type: Boolean })
  @ApiParam({ name: 'id', description: 'Organization UUID' })
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  public async delete(@Param('id') id: string): Promise<boolean> {
```
to:
```typescript
  @ApiOperation({ summary: 'Delete a organization' })
  @ApiOkResponse({ type: Boolean })
  @ApiParam({ name: 'id', description: 'Organization UUID' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(ERole.SuperAdmin)
  @Delete(':id')
  public async delete(@Param('id') id: string): Promise<boolean> {
```

- [ ] **Step 4: Guard `payment-transactions.controller.ts`**

Change the import on line 3 from:
```typescript
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query } from '@nestjs/common';
```
to:
```typescript
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
```

Change line 6 from:
```typescript
import { CqrsMediator } from '../../../common';
```
to:
```typescript
import { ClerkAuthGuard, CqrsMediator, RolesGuard, Roles } from '../../../common';
```

Add after the `IPageable` import (line 7):
```typescript
import { ERole } from '../../../infrastructure';
```

Change:
```typescript
@ApiBearerAuth()
@ApiTags('Payment Transactions')
@Controller({ path: 'payment-transactions', version: '1' })
export class PaymentTransactionsController {
```
to:
```typescript
@ApiBearerAuth()
@ApiTags('Payment Transactions')
@UseGuards(ClerkAuthGuard)
@Controller({ path: 'payment-transactions', version: '1' })
export class PaymentTransactionsController {
```

Change:
```typescript
  @ApiOperation({ summary: 'Update a payment transaction' })
  @ApiOkResponse({ type: PaymentTransactionResponse })
  @ApiParam({ name: 'id', description: 'Payment Transaction UUID' })
  @HttpCode(HttpStatus.OK)
  @Put(':id')
  public async update(@Param('id') id: string, @Body() body: UpdatePaymentTransactionRequest): Promise<PaymentTransactionResponse> {
```
to:
```typescript
  @ApiOperation({ summary: 'Update a payment transaction' })
  @ApiOkResponse({ type: PaymentTransactionResponse })
  @ApiParam({ name: 'id', description: 'Payment Transaction UUID' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(ERole.OrgAdmin, ERole.SuperAdmin)
  @Put(':id')
  public async update(@Param('id') id: string, @Body() body: UpdatePaymentTransactionRequest): Promise<PaymentTransactionResponse> {
```

Change:
```typescript
  @ApiOperation({ summary: 'Delete a payment transaction' })
  @ApiOkResponse({ type: Boolean })
  @ApiParam({ name: 'id', description: 'Payment Transaction UUID' })
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  public async delete(@Param('id') id: string): Promise<boolean> {
```
to:
```typescript
  @ApiOperation({ summary: 'Delete a payment transaction' })
  @ApiOkResponse({ type: Boolean })
  @ApiParam({ name: 'id', description: 'Payment Transaction UUID' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(ERole.OrgAdmin, ERole.SuperAdmin)
  @Delete(':id')
  public async delete(@Param('id') id: string): Promise<boolean> {
```

- [ ] **Step 5: Run and confirm all coverage assertions pass**

Run: `npm test -- rbac-guard-coverage`
Expected: all prior tests plus the new ones pass.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add src/application/modules/organizations/organizations.controller.ts \
        src/application/modules/payment-transactions/payment-transactions.controller.ts \
        src/common/auth/rbac-guard-coverage.spec.ts
git commit -m "fix: guard organizations and payment-transactions controllers"
```

---

## Task 4: Guard the remaining seven fully-open controllers

**Files:**
- Modify: `src/application/modules/platform-configurations/platform-configurations.controller.ts`
- Modify: `src/application/modules/expenses/expenses.controller.ts`
- Modify: `src/application/modules/item-returns/item-returns.controller.ts`
- Modify: `src/application/modules/report-generation-logs/report-generation-logs.controller.ts`
- Modify: `src/application/modules/purchase-items/purchase-items.controller.ts`
- Modify: `src/application/modules/activity-logs/activity-logs.controller.ts`
- Modify: `src/application/modules/orders/orders.controller.ts`
- Modify: `src/common/auth/rbac-guard-coverage.spec.ts`

- [ ] **Step 1: Add the failing coverage assertions**

Append to `src/common/auth/rbac-guard-coverage.spec.ts`:

```typescript
describe('platform-configurations controller', () => {
  const source = () => readController('platform-configurations/platform-configurations.controller.ts');

  it('requires Clerk authentication on the whole controller', () => {
    expect(hasClassGuard(source(), 'ClerkAuthGuard')).toBe(true);
  });

  it('restricts creating a platform configuration to platform tier', () => {
    const decorators = methodDecorators(source(), 'create');
    expect(hasMethodGuard(decorators, 'RolesGuard')).toBe(true);
    expect(methodRoles(decorators)).toEqual(['ERole.SuperAdmin']);
  });
});

describe('expenses controller', () => {
  const source = () => readController('expenses/expenses.controller.ts');

  it('requires Clerk authentication on the whole controller', () => {
    expect(hasClassGuard(source(), 'ClerkAuthGuard')).toBe(true);
  });

  it('restricts approving/rejecting an expense to manager tier', () => {
    const decorators = methodDecorators(source(), 'updateStatus');
    expect(hasMethodGuard(decorators, 'RolesGuard')).toBe(true);
    expect(methodRoles(decorators)).toEqual([
      'ERole.StoreManager',
      'ERole.OrgManager',
      'ERole.OrgAdmin',
      'ERole.SuperAdmin',
    ]);
  });

  it('leaves submitting an expense unrestricted beyond authentication', () => {
    const decorators = methodDecorators(source(), 'create');
    expect(hasMethodGuard(decorators, 'RolesGuard')).toBe(false);
  });
});

describe('item-returns controller', () => {
  const source = () => readController('item-returns/item-returns.controller.ts');

  it('requires Clerk authentication on the whole controller', () => {
    expect(hasClassGuard(source(), 'ClerkAuthGuard')).toBe(true);
  });

  it('restricts deleting an item return to manager tier', () => {
    const decorators = methodDecorators(source(), 'delete');
    expect(hasMethodGuard(decorators, 'RolesGuard')).toBe(true);
    expect(methodRoles(decorators)).toEqual([
      'ERole.StoreManager',
      'ERole.OrgManager',
      'ERole.OrgAdmin',
      'ERole.SuperAdmin',
    ]);
  });
});

describe('report-generation-logs controller', () => {
  const source = () => readController('report-generation-logs/report-generation-logs.controller.ts');

  it('requires Clerk authentication on the whole controller', () => {
    expect(hasClassGuard(source(), 'ClerkAuthGuard')).toBe(true);
  });

  it('restricts deleting a report generation log to manager tier', () => {
    const decorators = methodDecorators(source(), 'delete');
    expect(hasMethodGuard(decorators, 'RolesGuard')).toBe(true);
    expect(methodRoles(decorators)).toEqual([
      'ERole.StoreManager',
      'ERole.OrgManager',
      'ERole.OrgAdmin',
      'ERole.SuperAdmin',
    ]);
  });
});

describe('purchase-items controller', () => {
  it('requires Clerk authentication on the whole controller', () => {
    const source = readController('purchase-items/purchase-items.controller.ts');
    expect(hasClassGuard(source, 'ClerkAuthGuard')).toBe(true);
  });
});

describe('activity-logs controller', () => {
  it('requires Clerk authentication on the whole controller', () => {
    const source = readController('activity-logs/activity-logs.controller.ts');
    expect(hasClassGuard(source, 'ClerkAuthGuard')).toBe(true);
  });
});

describe('orders controller', () => {
  it('requires Clerk authentication on the whole controller', () => {
    const source = readController('orders/orders.controller.ts');
    expect(hasClassGuard(source, 'ClerkAuthGuard')).toBe(true);
  });
});
```

- [ ] **Step 2: Run and confirm every new assertion fails**

Run: `npm test -- rbac-guard-coverage`
Expected: every assertion in the seven new `describe` blocks fails (no `@UseGuards` exists on any of these seven controllers yet), except `'leaves submitting an expense unrestricted...'` which is vacuously true today.

- [ ] **Step 3: Guard `platform-configurations.controller.ts`**

Change line 3 from:
```typescript
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
```
to:
```typescript
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
```

Change line 6 from:
```typescript
import { CqrsMediator } from '../../../common';
```
to:
```typescript
import { ClerkAuthGuard, CqrsMediator, RolesGuard, Roles } from '../../../common';
```

Add immediately after:
```typescript
import { ERole } from '../../../infrastructure';
```

Change:
```typescript
@ApiBearerAuth()
@ApiTags('PlatformConfigurations')
@Controller({ path: 'platform-configurations', version: '1' })
export class PlatformConfigurationsController {
```
to:
```typescript
@ApiBearerAuth()
@ApiTags('PlatformConfigurations')
@UseGuards(ClerkAuthGuard)
@Controller({ path: 'platform-configurations', version: '1' })
export class PlatformConfigurationsController {
```

Change:
```typescript
  @ApiOperation({ summary: 'Create a new configuration' })
  @ApiCreatedResponse({ type: PlatformConfigurationResponse })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  public async create(@Body() body: CreatePlatformConfigurationRequest): Promise<PlatformConfigurationResponse> {
```
to:
```typescript
  @ApiOperation({ summary: 'Create a new configuration' })
  @ApiCreatedResponse({ type: PlatformConfigurationResponse })
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles(ERole.SuperAdmin)
  @Post()
  public async create(@Body() body: CreatePlatformConfigurationRequest): Promise<PlatformConfigurationResponse> {
```

- [ ] **Step 4: Guard `expenses.controller.ts`**

Change line 3 from:
```typescript
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
```
to:
```typescript
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
```

Change line 7 from:
```typescript
import { CqrsMediator } from '../../../common';
```
to:
```typescript
import { ClerkAuthGuard, CqrsMediator, RolesGuard, Roles } from '../../../common';
```

Add immediately after:
```typescript
import { ERole } from '../../../infrastructure';
```

Change:
```typescript
@ApiBearerAuth()
@ApiTags('Expenses')
@Controller({ path: 'expenses', version: '1' })
export class ExpensesController {
```
to:
```typescript
@ApiBearerAuth()
@ApiTags('Expenses')
@UseGuards(ClerkAuthGuard)
@Controller({ path: 'expenses', version: '1' })
export class ExpensesController {
```

Change:
```typescript
  @ApiOperation({ summary: 'Update expense status (approve / reject)' })
  @ApiOkResponse({ type: ExpenseResponse })
  @ApiParam({ name: 'id', description: 'Expense UUID' })
  @HttpCode(HttpStatus.OK)
  @Patch(':id/status')
  public async updateStatus(
```
to:
```typescript
  @ApiOperation({ summary: 'Update expense status (approve / reject)' })
  @ApiOkResponse({ type: ExpenseResponse })
  @ApiParam({ name: 'id', description: 'Expense UUID' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(ERole.StoreManager, ERole.OrgManager, ERole.OrgAdmin, ERole.SuperAdmin)
  @Patch(':id/status')
  public async updateStatus(
```

- [ ] **Step 5: Guard `item-returns.controller.ts`**

Change line 3 from:
```typescript
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query } from '@nestjs/common';
```
to:
```typescript
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
```

Change line 6 from:
```typescript
import { CqrsMediator } from '../../../common';
```
to:
```typescript
import { ClerkAuthGuard, CqrsMediator, RolesGuard, Roles } from '../../../common';
```

Add after the `IPageable` import (line 7):
```typescript
import { ERole } from '../../../infrastructure';
```

Change:
```typescript
@ApiBearerAuth()
@ApiTags('Item Returns')
@Controller({ path: 'item-returns', version: '1' })
export class ItemReturnsController {
```
to:
```typescript
@ApiBearerAuth()
@ApiTags('Item Returns')
@UseGuards(ClerkAuthGuard)
@Controller({ path: 'item-returns', version: '1' })
export class ItemReturnsController {
```

Change:
```typescript
  @ApiOperation({ summary: 'Delete a item return' })
  @ApiOkResponse({ type: Boolean })
  @ApiParam({ name: 'id', description: 'Item Return UUID' })
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  public async delete(@Param('id') id: string): Promise<boolean> {
```
to:
```typescript
  @ApiOperation({ summary: 'Delete a item return' })
  @ApiOkResponse({ type: Boolean })
  @ApiParam({ name: 'id', description: 'Item Return UUID' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(ERole.StoreManager, ERole.OrgManager, ERole.OrgAdmin, ERole.SuperAdmin)
  @Delete(':id')
  public async delete(@Param('id') id: string): Promise<boolean> {
```

- [ ] **Step 6: Guard `report-generation-logs.controller.ts`**

Change line 3 from:
```typescript
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query } from '@nestjs/common';
```
to:
```typescript
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
```

Change line 6 from:
```typescript
import { CqrsMediator } from '../../../common';
```
to:
```typescript
import { ClerkAuthGuard, CqrsMediator, RolesGuard, Roles } from '../../../common';
```

Add after the `IPageable` import (line 7):
```typescript
import { ERole } from '../../../infrastructure';
```

Change:
```typescript
@ApiBearerAuth()
@ApiTags('Report Generation Logs')
@Controller({ path: 'report-generation-logs', version: '1' })
export class ReportGenerationLogsController {
```
to:
```typescript
@ApiBearerAuth()
@ApiTags('Report Generation Logs')
@UseGuards(ClerkAuthGuard)
@Controller({ path: 'report-generation-logs', version: '1' })
export class ReportGenerationLogsController {
```

Change:
```typescript
  @ApiOperation({ summary: 'Delete a report log' })
  @ApiOkResponse({ type: Boolean })
  @ApiParam({ name: 'id', description: 'Report Log UUID' })
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  public async delete(@Param('id') id: string): Promise<boolean> {
```
to:
```typescript
  @ApiOperation({ summary: 'Delete a report log' })
  @ApiOkResponse({ type: Boolean })
  @ApiParam({ name: 'id', description: 'Report Log UUID' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(ERole.StoreManager, ERole.OrgManager, ERole.OrgAdmin, ERole.SuperAdmin)
  @Delete(':id')
  public async delete(@Param('id') id: string): Promise<boolean> {
```

- [ ] **Step 7: Guard `purchase-items.controller.ts`, `activity-logs.controller.ts`, `orders.controller.ts`**

These three need only the class-level guard (no method needs role restriction — each exposes only reads plus one routine `create`).

For each of the three, change the `@nestjs/common` import line from:
```typescript
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
```
to:
```typescript
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
```

Change the `'../../../common'` import from:
```typescript
import { CqrsMediator } from '../../../common';
```
to:
```typescript
import { ClerkAuthGuard, CqrsMediator } from '../../../common';
```

For `purchase-items.controller.ts`, change:
```typescript
@ApiBearerAuth()
@ApiTags('PurchaseItems')
@Controller({ path: 'purchase-items', version: '1' })
export class PurchaseItemsController {
```
to:
```typescript
@ApiBearerAuth()
@ApiTags('PurchaseItems')
@UseGuards(ClerkAuthGuard)
@Controller({ path: 'purchase-items', version: '1' })
export class PurchaseItemsController {
```

For `activity-logs.controller.ts`, change:
```typescript
@ApiBearerAuth()
@ApiTags('ActivityLogs')
@Controller({ path: 'activity-logs', version: '1' })
export class ActivityLogsController {
```
to:
```typescript
@ApiBearerAuth()
@ApiTags('ActivityLogs')
@UseGuards(ClerkAuthGuard)
@Controller({ path: 'activity-logs', version: '1' })
export class ActivityLogsController {
```

For `orders.controller.ts`, change:
```typescript
@ApiBearerAuth()
@ApiTags('Orders')
@Controller({ path: 'orders', version: '1' })
export class OrdersController {
```
to:
```typescript
@ApiBearerAuth()
@ApiTags('Orders')
@UseGuards(ClerkAuthGuard)
@Controller({ path: 'orders', version: '1' })
export class OrdersController {
```

- [ ] **Step 8: Run and confirm every coverage assertion passes**

Run: `npm test -- rbac-guard-coverage`
Expected: all tests pass, including everything from Tasks 1-3.

- [ ] **Step 9: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 10: Commit**

```bash
git add src/application/modules/platform-configurations/platform-configurations.controller.ts \
        src/application/modules/expenses/expenses.controller.ts \
        src/application/modules/item-returns/item-returns.controller.ts \
        src/application/modules/report-generation-logs/report-generation-logs.controller.ts \
        src/application/modules/purchase-items/purchase-items.controller.ts \
        src/application/modules/activity-logs/activity-logs.controller.ts \
        src/application/modules/orders/orders.controller.ts \
        src/common/auth/rbac-guard-coverage.spec.ts
git commit -m "fix: guard the remaining seven fully-open controllers"
```

---

## Task 5: Elevate destructive endpoints on the already-authenticated controllers

Applies to controllers that already have `@UseGuards(ClerkAuthGuard)` at the class level but no `@Roles` anywhere — the RBAC audit's "medium" list. Rather than blanket-locking every route (which would break routine staff workflows), only the genuinely destructive `DELETE` endpoints on org-owned business records get elevated. `notifications.delete` is deliberately excluded — it deletes the caller's own notification (no ownership check exists to distinguish "mine" from "someone else's" today, so elevating it would just break the self-service delete without adding real protection; the underlying missing-ownership-check gap is named in Task 7, not fixed here).

**Files:**
- Modify: `src/application/modules/customers/customers.controller.ts`
- Modify: `src/application/modules/drivers/drivers.controller.ts`
- Modify: `src/application/modules/trips/trips.controller.ts`
- Modify: `src/application/modules/vehicle-expenses/vehicle-expenses.controller.ts`
- Modify: `src/application/modules/vehicles/vehicles.controller.ts`
- Modify: `src/common/auth/rbac-guard-coverage.spec.ts`

- [ ] **Step 1: Add the failing coverage assertions**

Append to `src/common/auth/rbac-guard-coverage.spec.ts`:

```typescript
describe('destructive-endpoint role elevation (already-authenticated controllers)', () => {
  const managerTier = ['ERole.StoreManager', 'ERole.OrgManager', 'ERole.OrgAdmin', 'ERole.SuperAdmin'];

  it.each([
    ['customers/customers.controller.ts', 'delete'],
    ['drivers/drivers.controller.ts', 'delete'],
    ['trips/trips.controller.ts', 'delete'],
    ['vehicle-expenses/vehicle-expenses.controller.ts', 'delete'],
    ['vehicles/vehicles.controller.ts', 'delete'],
  ])('restricts %s#%s to manager tier', (relativePath, method) => {
    const source = readController(relativePath);
    const decorators = methodDecorators(source, method);
    expect(hasMethodGuard(decorators, 'RolesGuard')).toBe(true);
    expect(methodRoles(decorators)).toEqual(managerTier);
  });

  it('leaves notifications#delete unrestricted (self-service resource, no ownership check to key off yet)', () => {
    const source = readController('notifications/notifications.controller.ts');
    const decorators = methodDecorators(source, 'delete');
    expect(hasMethodGuard(decorators, 'RolesGuard')).toBe(false);
  });
});
```

- [ ] **Step 2: Run and confirm the five elevation assertions fail**

Run: `npm test -- rbac-guard-coverage`
Expected: the five `it.each` cases fail (no `RolesGuard`/`@Roles` on any `delete` method yet); the `notifications` assertion already passes (nothing to change there).

- [ ] **Step 3: Elevate `customers.controller.ts#delete`**

Change line 6 from:
```typescript
import { AuthenticatedUser, ClerkAuthGuard, CqrsMediator, CurrentUser, IPageable } from '../../../common';
```
to:
```typescript
import { AuthenticatedUser, ClerkAuthGuard, CqrsMediator, CurrentUser, IPageable, RolesGuard, Roles } from '../../../common';
```

Add after line 10 (after the `queries` import):
```typescript
import { ERole } from '../../../infrastructure';
```

Change:
```typescript
  @ApiOperation({ summary: 'Delete a customer (soft delete)' })
  @ApiOkResponse({ type: Boolean })
  @ApiParam({ name: 'id', description: 'Customer UUID' })
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  public async delete(@Param('id') id: string): Promise<boolean> {
```
to:
```typescript
  @ApiOperation({ summary: 'Delete a customer (soft delete)' })
  @ApiOkResponse({ type: Boolean })
  @ApiParam({ name: 'id', description: 'Customer UUID' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(ERole.StoreManager, ERole.OrgManager, ERole.OrgAdmin, ERole.SuperAdmin)
  @Delete(':id')
  public async delete(@Param('id') id: string): Promise<boolean> {
```

(`UseGuards` is already imported in this file — see line 3.)

- [ ] **Step 4: Elevate `drivers.controller.ts#delete`**

Change line 6 from:
```typescript
import { AuthenticatedUser, ClerkAuthGuard, CqrsMediator, CurrentUser, IPageable } from '../../../common';
```
to:
```typescript
import { AuthenticatedUser, ClerkAuthGuard, CqrsMediator, CurrentUser, IPageable, RolesGuard, Roles } from '../../../common';
```

Add after line 10 (after the commands import):
```typescript
import { ERole } from '../../../infrastructure';
```

Change:
```typescript
  @ApiOperation({ summary: 'Delete a driver' })
  @ApiOkResponse({ type: Boolean })
  @ApiParam({ name: 'id', description: 'Driver UUID' })
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  public async delete(@Param('id') id: string): Promise<boolean> {
```
to:
```typescript
  @ApiOperation({ summary: 'Delete a driver' })
  @ApiOkResponse({ type: Boolean })
  @ApiParam({ name: 'id', description: 'Driver UUID' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(ERole.StoreManager, ERole.OrgManager, ERole.OrgAdmin, ERole.SuperAdmin)
  @Delete(':id')
  public async delete(@Param('id') id: string): Promise<boolean> {
```

- [ ] **Step 5: Elevate `trips.controller.ts#delete`**

Change line 6 from:
```typescript
import { AuthenticatedUser, ClerkAuthGuard, CqrsMediator, CurrentUser, IPageable } from '../../../common';
```
to:
```typescript
import { AuthenticatedUser, ClerkAuthGuard, CqrsMediator, CurrentUser, IPageable, RolesGuard, Roles } from '../../../common';
```

Add after line 10:
```typescript
import { ERole } from '../../../infrastructure';
```

Change:
```typescript
  @ApiOperation({ summary: 'Delete a trip' })
  @ApiOkResponse({ type: Boolean })
  @ApiParam({ name: 'id', description: 'Trip UUID' })
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  public async delete(@Param('id') id: string): Promise<boolean> {
    const command = new DeleteTripCommand(id);
```
to:
```typescript
  @ApiOperation({ summary: 'Delete a trip' })
  @ApiOkResponse({ type: Boolean })
  @ApiParam({ name: 'id', description: 'Trip UUID' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(ERole.StoreManager, ERole.OrgManager, ERole.OrgAdmin, ERole.SuperAdmin)
  @Delete(':id')
  public async delete(@Param('id') id: string): Promise<boolean> {
    const command = new DeleteTripCommand(id);
```

- [ ] **Step 6: Elevate `vehicle-expenses.controller.ts#delete`**

Change line 6 from:
```typescript
import { AuthenticatedUser, ClerkAuthGuard, CqrsMediator, CurrentUser } from '../../../common';
```
to:
```typescript
import { AuthenticatedUser, ClerkAuthGuard, CqrsMediator, CurrentUser, RolesGuard, Roles } from '../../../common';
```

Add after line 9:
```typescript
import { ERole } from '../../../infrastructure';
```

Change:
```typescript
  @ApiOperation({ summary: 'Delete a vehicle expense' })
  @ApiOkResponse({ type: Boolean })
  @ApiParam({ name: 'id', description: 'Vehicle Expense UUID' })
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  public async delete(@Param('id') id: string): Promise<boolean> {
```
to:
```typescript
  @ApiOperation({ summary: 'Delete a vehicle expense' })
  @ApiOkResponse({ type: Boolean })
  @ApiParam({ name: 'id', description: 'Vehicle Expense UUID' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(ERole.StoreManager, ERole.OrgManager, ERole.OrgAdmin, ERole.SuperAdmin)
  @Delete(':id')
  public async delete(@Param('id') id: string): Promise<boolean> {
```

- [ ] **Step 7: Elevate `vehicles.controller.ts#delete`**

Change line 6 from:
```typescript
import { AuthenticatedUser, ClerkAuthGuard, CqrsMediator, CurrentUser, IPageable } from '../../../common';
```
to:
```typescript
import { AuthenticatedUser, ClerkAuthGuard, CqrsMediator, CurrentUser, IPageable, RolesGuard, Roles } from '../../../common';
```

Add after line 17 (after the commands import):
```typescript
import { ERole } from '../../../infrastructure';
```

Change:
```typescript
  @ApiOperation({ summary: 'Delete a vehicle' })
  @ApiOkResponse({ type: Boolean })
  @ApiParam({ name: 'id', description: 'Vehicle UUID' })
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  public async delete(@Param('id') id: string): Promise<boolean> {
    const command = new DeleteVehicleCommand(id);
```
to:
```typescript
  @ApiOperation({ summary: 'Delete a vehicle' })
  @ApiOkResponse({ type: Boolean })
  @ApiParam({ name: 'id', description: 'Vehicle UUID' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(ERole.StoreManager, ERole.OrgManager, ERole.OrgAdmin, ERole.SuperAdmin)
  @Delete(':id')
  public async delete(@Param('id') id: string): Promise<boolean> {
    const command = new DeleteVehicleCommand(id);
```

- [ ] **Step 8: Run and confirm all coverage assertions pass**

Run: `npm test -- rbac-guard-coverage`
Expected: all tests pass, including everything from Tasks 1-4.

- [ ] **Step 9: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 10: Commit**

```bash
git add src/application/modules/customers/customers.controller.ts \
        src/application/modules/drivers/drivers.controller.ts \
        src/application/modules/trips/trips.controller.ts \
        src/application/modules/vehicle-expenses/vehicle-expenses.controller.ts \
        src/application/modules/vehicles/vehicles.controller.ts \
        src/common/auth/rbac-guard-coverage.spec.ts
git commit -m "fix: restrict destructive endpoints on already-authenticated controllers to manager tier"
```

---

## Task 6: Commit the pending invoices guard fix

This diff already exists, uncommitted, in the working tree from a prior session — it is not new work, just needs a coverage assertion and a commit so it doesn't keep sitting unstaged.

**Files:**
- Already modified (uncommitted): `src/application/modules/invoices/invoices.controller.ts`
- Already modified (uncommitted): `src/common/auth/strategies/clerk-jwt.strategy.ts`
- Modify: `src/common/auth/rbac-guard-coverage.spec.ts`

- [ ] **Step 1: Confirm the pending diff is still present and unchanged**

Run: `git diff -- src/application/modules/invoices/invoices.controller.ts src/common/auth/strategies/clerk-jwt.strategy.ts`
Expected: the invoices diff adds `@UseGuards(ClerkAuthGuard, RolesGuard)` at the class level; the strategy diff adds the missing-email guard and the primary-email fallback. If this diff is no longer present (already committed by another session), skip to Step 5 with no changes needed.

- [ ] **Step 2: Add the coverage assertion**

Append to `src/common/auth/rbac-guard-coverage.spec.ts`:

```typescript
describe('invoices controller', () => {
  it('requires Clerk authentication and carries the RolesGuard chain', () => {
    const source = readController('invoices/invoices.controller.ts');
    expect(hasClassGuard(source, 'ClerkAuthGuard')).toBe(true);
    expect(hasClassGuard(source, 'RolesGuard')).toBe(true);
  });
});
```

- [ ] **Step 3: Run and confirm it passes**

Run: `npm test -- rbac-guard-coverage`
Expected: passes immediately — the fix is already in the working tree, this step is confirming it, not driving it.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/application/modules/invoices/invoices.controller.ts \
        src/common/auth/strategies/clerk-jwt.strategy.ts \
        src/common/auth/rbac-guard-coverage.spec.ts
git commit -m "fix: guard invoices controller and resolve Clerk password-account email resolution"
```

---

## Task 7: Record the follow-ups this plan deliberately does not fix

No code changes. This plan closes every controller-level authorization gap found by the audit, but two adjacent gaps surfaced during investigation that are out of scope here — write them down so they don't silently disappear.

**Files:**
- Create: `docs/superpowers/plans/2026-08-12-rbac-guard-enforcement-followups.md`

- [ ] **Step 1: Write the follow-ups file**

```markdown
# Follow-ups from the RBAC guard enforcement plan (2026-08-12)

Not fixed by that plan, found during it:

1. **No resource-ownership scoping.** `RolesGuard` checks role membership only, not whether the caller's `organizationId` matches the resource being read/written. `organizations.controller.ts`'s `GET` routes, for example, let any authenticated user (any org) read any organization's record once past `ClerkAuthGuard` — the guard fix in this plan restricts *mutation* to `SuperAdmin`, but does not scope *reads* to the caller's own org. Needs a resource-level check (e.g. compare `CurrentUser().organizationId` against the loaded entity) added at the command/query-handler level, not the guard level — guards don't have the loaded entity to compare against.

2. **No test harness for request-level (behavioral) guard verification.** Every test in the RBAC guard enforcement plan asserts on controller *source* (decorator presence), not on an actual HTTP request being rejected. That's because two things are missing in this repo: (a) `test/jest-e2e.json` referenced by the `test:e2e` npm script does not exist, and (b) importing any controller class at runtime in Jest currently fails — every controller pulls in `@automapper/core`, which ships ESM-only and isn't covered by this repo's `ts-jest` transform config (`SyntaxError: Unexpected token 'export'`, confirmed by direct probe). Building a real e2e harness needs both: a `test/jest-e2e.json` config, and either a `transformIgnorePatterns`/`transform` fix for the ESM packages or a lighter-weight approach (e.g. `supertest` against a running instance rather than an in-process Nest app). This is a standalone infra project, not a one-off fix.
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/plans/2026-08-12-rbac-guard-enforcement-followups.md
git commit -m "docs: record RBAC guard enforcement follow-ups"
```
