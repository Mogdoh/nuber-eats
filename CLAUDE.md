# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 구조

NestJS + GraphQL + TypeORM 기반 음식 배달 앱 클론 백엔드 (`nuber-eats-backend/`). 코드 퍼스트 방식으로 GraphQL 스키마를 자동 생성한다.

## 명령어

모든 명령어는 `nuber-eats-backend/`에서 실행:

```bash
npm run start:dev       # 개발 서버 (NODE_ENV=dev, 파일 변경 감지)
npm run build           # NestJS CLI로 TypeScript 컴파일
npm run start:prod      # 컴파일된 결과물 실행
npm run lint            # ESLint 자동 수정
npm run format          # Prettier 포매팅
npm run test            # 유닛 테스트 (*.spec.ts 파일)
npm run test:watch      # 유닛 테스트 watch 모드
npm run test:cov        # 유닛 테스트 커버리지 (*.entity.ts, *.constants.ts 제외)
npm run test:e2e        # E2E 테스트 (설정: test/jest-e2e.json, *.e2e-spec.ts 파일)
```

단일 테스트 파일 실행:
```bash
npx jest src/restaurants/restaurants.resolver.spec.ts
```

## 아키텍처

### NestJS 모듈 패턴
각 기능은 `*.module.ts` → `*.resolver.ts` (GraphQL) + `*.service.ts` + `*.entity.ts` + `dtos/` 구조를 따른다. 새 모듈은 `src/app.module.ts`의 `AppModule` imports에 추가. 엔티티는 `TypeOrmModule.forRoot({ entities: [...] })`에도 반드시 등록.

- Resolver: GraphQL 쿼리/뮤테이션 처리 후 Service에 위임
- Service: 비즈니스 로직, TypeORM Repository 사용
- Mutation은 기본적으로 `{ ok: boolean, error?: string }` Output DTO 반환 (UsersModule 패턴) 또는 `boolean` 반환 (RestaurantsModule 패턴)

### CoreEntity — 공통 베이스 클래스
모든 엔티티는 `src/common/entities/core.entity.ts`의 `CoreEntity`를 상속한다. `id`, `createdAt`, `updatedAt` 필드를 제공.

```typescript
// core.entity.ts
export class CoreEntity {
  @PrimaryGeneratedColumn() @Field((type) => Number) id: number;
  @CreateDateColumn() @Field((type) => Date) createdAt: Date;
  @UpdateDateColumn() @Field((type) => Date) updatedAt: Date;
}

// 사용 엔티티
@InputType({ isAbstract: true })  // ← PickType/OmitType에서 엔티티를 직접 사용할 때 필요
@ObjectType()
@Entity()
export class User extends CoreEntity { ... }
```

`@InputType({ isAbstract: true })`를 추가해야 엔티티를 `PickType`/`OmitType`의 소스로 쓸 때 GraphQL 스키마 충돌이 발생하지 않는다.

### GraphQL: 코드 퍼스트 방식
- 스키마는 메모리에서 자동 생성 (`autoSchemaFile: true`) — `.graphql` 파일 없음
- `main.ts`의 전역 `ValidationPipe`로 DTO 유효성 검사 자동 처리
- class-validator 데코레이터(`@IsString`, `@Length` 등)는 **엔티티 필드에 직접 선언**하며, Mapped Types를 통해 DTO에서 재사용됨
- import 경로는 `@nestjs/graphql` 사용 (`@nestjs/graphql/dist`는 비권장)

### DTO 패턴

**Input DTO** — Mapped Types로 엔티티 필드 재사용:
```typescript
// PickType: 특정 필드만 선택
@InputType()
export class CreateAccountInput extends PickType(User, ['email', 'password', 'role']) {}

// OmitType: 특정 필드 제외 (세 번째 인자 InputType 필수 — 엔티티가 ObjectType이므로)
@InputType()
export class CreateRestaurantDto extends OmitType(Restaurant, ['id'], InputType) {}

// UpdateDto: id + PartialType 중첩 구조
@InputType()
export class UpdateRestaurantInputType extends PartialType(CreateRestaurantDto) {}
@InputType()
export class UpdateRestaurantDto {
  @Field((type) => Number) id: number;
  @Field((type) => UpdateRestaurantInputType) data: UpdateRestaurantInputType;
}
```

**Output DTO** — Mutation 응답 구조 (`{ ok, error? }` 패턴):
```typescript
@ObjectType()
export class CreateAccountOutput {
  @Field((type) => String, { nullable: true }) error?: string;
  @Field((type) => Boolean) ok: boolean;
}
```

### 데이터베이스
- PostgreSQL + TypeORM; `synchronize` / `logging` 모두 `process.env.NODE_ENV !== 'prod'` 조건
- 엔티티는 `TypeOrmModule.forRoot({ entities: [...] })`(앱 레벨)과 `TypeOrmModule.forFeature([...])`(기능 모듈 — Repository 주입에 필수) 양쪽에 등록
- `@PrimaryGeneratedColumn()`과 `@Column()`을 같은 필드에 함께 사용하면 안 됨
- 새 레코드 삽입: `create(dto)` → `save(entity)` 순서 (`@BeforeInsert()` 등 훅 실행 보장)
- 부분 업데이트: `update(id, partialEntity)` 사용 (훅 미실행 — 단순 업데이트에만 적합)

### import 경로
- `src/` 절대경로 불가 — `tsconfig.json`의 `paths`가 `node_modules/*`만 매핑함
- 모듈 간 import는 반드시 **상대경로** 사용 (`../../common/entities/core.entity`)

### 환경 변수
- 개발: `.env.dev` (`NODE_ENV=dev`일 때 로드), 테스트: `.env.test` (그 외)
- `ConfigModule`의 `validationSchema`로 앱 시작 시 필수 환경 변수 검증 — 새 변수 추가 시 여기에도 등록
- `ConfigModule`은 전역(global) — 어디서든 재import 없이 `ConfigService` 주입 가능
- `process.env` 값은 `string | undefined`; 숫자형은 `+process.env.SOME_PORT!` 사용

### 알려진 오타
- `restaurnatService` — `RestaurantsResolver` 생성자 내 변수명 오타 (수정 예정)

### 미구현 (예정)
- JWT/Auth 모듈 (`jsonwebtoken`, `bcrypt` 설치됨)
- `UsersService.createAccount()` 구현

### 코드 스타일
- 작은따옴표, 후행 쉼표 (Prettier 강제 적용)
- `noImplicitAny: false` — 타입 어노테이션 선택적이지만 명확성을 위해 권장
