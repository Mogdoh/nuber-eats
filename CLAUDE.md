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
각 기능은 `*.module.ts` → `*.resolver.ts` (GraphQL) + `*.service.ts` + `*.entity.ts` + `dto/` 구조를 따른다. 새 모듈은 `src/app.module.ts`의 `AppModule` imports에 추가.

- Resolver: GraphQL 쿼리/뮤테이션 처리 후 Service에 위임
- Service: 비즈니스 로직, TypeORM Repository 사용
- Module: `providers`와 `imports`로 연결
- Mutation은 기본적으로 `boolean` 반환 — try/catch로 감싸고 성공 시 `true`, 실패 시 `console.error` + `false`

### GraphQL: 코드 퍼스트 방식
- 엔티티 클래스에 `@ObjectType()` + `@Field()` 데코레이터로 스키마 정의
- 스키마는 메모리에서 자동 생성 (`autoSchemaFile: true`) — `.graphql` 파일 없음
- `main.ts`의 전역 `ValidationPipe`로 DTO 유효성 검사 자동 처리
- class-validator 데코레이터(`@IsString`, `@Length` 등)는 **엔티티 필드에 직접 선언**하며, Mapped Types를 통해 DTO에서 재사용됨
- import 경로는 `@nestjs/graphql`을 사용 (`@nestjs/graphql/dist`는 비권장)

### DTO — Mapped Types 패턴
엔티티 필드를 중복 선언하지 않고 상속해서 사용:

```typescript
// CreateDto: id 제외하고 엔티티 그대로 상속
@InputType()
export class CreateRestaurantDto extends OmitType(Restaurant, ['id'], InputType) {}

// UpdateDto: id(식별자) + data(변경 필드)를 별도 InputType으로 분리
@InputType()
export class UpdateRestaurantInputType extends PartialType(CreateRestaurantDto) {}

@InputType()
export class UpdateRestaurantDto {
  @Field((type) => Number)
  id: number;
  @Field((type) => UpdateRestaurantInputType)
  data: UpdateRestaurantInputType;
}
```

- `OmitType` — 특정 필드 제외하고 상속
- `PickType` — 특정 필드만 선택해서 상속
- `PartialType` — 모든 필드를 optional로 상속 (UpdateDto에 활용)
- 세 번째 인자 `InputType`: 엔티티가 `@ObjectType()`이므로 `@InputType()`으로 변환 필요

### 데이터베이스
- PostgreSQL + TypeORM; `synchronize` / `logging` 모두 `process.env.NODE_ENV !== 'prod'` 조건으로 설정
- 엔티티는 `TypeOrmModule.forRoot({ entities: [...] })`(앱 레벨)과 `TypeOrmModule.forFeature([...])`(기능 모듈 — Repository 주입에 필수) 양쪽에 등록
- `@PrimaryGeneratedColumn()`과 `@Column()`을 같은 필드에 함께 사용하면 안 됨
- 새 레코드 삽입: `create(dto)` → `save(entity)` 순서로 처리 (`@BeforeInsert()` 등 훅 실행 보장)
- 부분 업데이트: `update(id, partialEntity)` 사용 (훅 미실행 — 단순 업데이트에만 적합)

### 환경 변수
- 개발: `.env.dev` (`NODE_ENV=dev`일 때 로드), 테스트: `.env.test` (그 외)
- 앱 시작 시 `ConfigModule`의 `validationSchema: Joi.object({...})`로 필수 환경 변수 검증 — 새 변수 추가 시 여기에도 등록해야 앱 시작 시 빠르게 오류 감지
- `ConfigModule`은 전역(global) — 어디서든 재import 없이 `ConfigService` 주입 가능
- `process.env` 값은 항상 `string | undefined`; 숫자형은 `+process.env.SOME_PORT!` 사용 (Joi 검증으로 런타임에는 존재 보장)
- 서버 포트: `process.env.PORT ?? 3000`

### 알려진 오타 (의도적으로 유지 중)
- `UdateRestaurantDto` — "Update" 오타 (`update-restaurant.dto.ts`)
- `restaurnatService` — resolver 생성자 내 변수명 오타

### 미구현 (예정)
- 인증: `jsonwebtoken`, `bcrypt` 의존성 설치됨 — JWT/Auth 모듈 미구현
- UsersModule 미구현

### 코드 스타일
- 작은따옴표, 후행 쉼표 (Prettier 강제 적용)
- `noImplicitAny: false` — 타입 어노테이션 선택적이지만 명확성을 위해 권장
