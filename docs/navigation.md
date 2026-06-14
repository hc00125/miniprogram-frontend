# 前端页面导航规范

## 页面分级

### 一级主页面

底部导航对应的页面属于一级主页面：

- 首页：`/pages/boss/home/index?tab=home`
- 点单：`/pages/boss/home/index?tab=order`
- 订单：`/pages/boss/query/index`
- 陪玩：`/pages/player/list/index`
- 我的：`/pages/client/profile/index`

一级主页面之间必须通过 `switchMainTab()` 切换。该函数使用 `uni.reLaunch()`，不会继续向微信小程序页面栈压入页面。

```ts
import { switchMainTab } from '@/utils/nav'

switchMainTab('query')
switchMainTab('players')
switchMainTab('profile')
```

首页和点单共用同一个页面。用户已经位于首页页面时，应优先在页面内部切换 swiper，而不是重新启动页面。

### 二级页面

订单详情、账号信息、陪玩申请等需要正常返回的页面使用 `openPage()`：

```ts
import { openPage } from '@/utils/nav'

openPage('/pages/boss/waiting/index', { orderNo })
openPage('/pages/client/account/index')
openPage('/pages/player/apply/index')
```

`openPage()` 内部使用 `uni.navigateTo()`，会保留上一级页面。

### 流程替换页面

登录完成、下单成功、提交成功等不应返回旧表单的流程使用 `replacePage()`：

```ts
import { replacePage } from '@/utils/nav'

replacePage('/pages/boss/waiting/index', { orderNo })
```

`replacePage()` 内部使用 `uni.redirectTo()`，会替换当前页面。

## 禁止事项

- 禁止使用 `navigateTo` 切换底部主导航页面。
- 禁止在业务页面中重复维护主页面路径表。
- 禁止登录成功、下单成功后继续保留可重复提交的旧表单页面。
- 禁止通过连续 `navigateBack()` 猜测一级主页面的位置。

## 兼容接口

旧的 `go()`、`replace()`、`goMain()` 和 `navigateToTab()` 暂时保留，避免一次性修改全部页面造成风险：

- `go()` 等价于 `openPage()`。
- `replace()` 等价于 `replacePage()`。
- `goMain()` 等价于 `switchMainTab()`。
- `navigateToTab()` 已改为调用 `switchMainTab()`，不再产生页面堆栈。

新增页面应直接使用语义清晰的新接口。
