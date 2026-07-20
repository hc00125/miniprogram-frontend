<template>
  <view class="legal-page">
    <view class="hero-card">
      <text class="eyebrow">PRIVACY POLICY</text>
      <text class="title">偷吃电竞隐私政策</text>
      <text class="meta">版本：1.0　发布日期及生效日期：2026年7月13日</text>
    </view>

    <view class="notice-card">
      <text class="notice-title">特别提示</text>
      <text class="notice-text">
        请您在使用偷吃电竞小程序前认真阅读本政策。只有在您主动勾选同意后，我们才会调用微信登录并处理登录所必需的信息。您不同意本政策，仍可浏览无需登录的公开页面，但无法使用点单、订单查询、申请陪玩师、评价及提现等需要账号识别的功能。
      </text>
    </view>

    <view class="operator-card">
      <view><text>小程序名称</text><text>偷吃电竞</text></view>
      <view><text>运营者</text><text>以微信公众平台公示的认证主体为准</text></view>
      <view><text>联系渠道</text><text>小程序“我的—联系客服”或微信公众平台公示渠道</text></view>
    </view>

    <view v-for="section in sections" :key="section.title" class="section-card">
      <text class="section-title">{{ section.title }}</text>
      <view v-for="(paragraph, index) in section.paragraphs" :key="index" class="paragraph">
        <text>{{ paragraph }}</text>
      </view>
      <view v-if="section.items?.length" class="item-list">
        <view v-for="(item, index) in section.items" :key="index" class="item-row">
          <text class="item-index">{{ index + 1 }}</text>
          <text class="item-text">{{ item }}</text>
        </view>
      </view>
    </view>

    <view class="footer-card">
      <text>本政策为结合当前业务功能形成的初版文本。小程序功能、第三方服务或个人信息处理方式发生变化时，我们会更新本政策并通过页面提示等合理方式告知您。</text>
    </view>
  </view>
</template>

<script setup lang="ts">
type PolicySection = {
  title: string
  paragraphs: string[]
  items?: string[]
}

const sections: PolicySection[] = [
  {
    title: '一、适用范围',
    paragraphs: [
      '本政策适用于偷吃电竞微信小程序提供的浏览、微信登录、点单、订单管理、陪玩师申请与展示、服务评价、收益结算及提现申请等功能。微信平台自身提供的基础能力和服务，适用腾讯及微信平台另行公布的规则。'
    ]
  },
  {
    title: '二、我们如何收集和使用个人信息',
    paragraphs: [
      '我们遵循合法、正当、必要和诚信原则，仅处理实现相应功能所必需的信息。您可以选择不提供非必需信息，但部分对应功能可能无法使用。'
    ],
    items: [
      '账号登录信息：当您主动勾选同意并点击微信登录时，我们通过微信登录接口取得临时登录凭证，并由服务器换取用于识别账号的 OpenID 或同类账号标识，用于创建账号、保持登录状态、识别订单归属和保障账号安全。我们不会在小程序前端保存微信 AppSecret。',
      '头像和昵称：当您主动选择微信头像或填写、修改昵称时，我们会保存相应头像文件或地址及昵称，用于个人中心、订单服务阵容和陪玩师公开资料展示。您不选择头像时，可以继续使用默认头像。',
      '订单及服务信息：当您点单时，我们会处理您主动填写或选择的游戏ID、队伍码、联系微信、商品套餐、规格、数量、订单备注、指定陪玩、KOOK房间号、订单状态、服务开始和结束时间等，用于派单、接单、履约、订单查询、客服和争议处理。',
      '支付信息：当您使用微信小程序虚拟支付时，我们会处理订单号、支付单号、商品标识、金额、支付状态、支付时间及微信侧返回的交易标识，用于发起支付、确认到账、对账、售后和防止重复支付。支付账户及支付密码由微信平台处理，我们不会取得您的支付密码。',
      '评价信息：当您对陪玩师评分或发表评论时，我们会保存星级、文字评价、对应订单、被评价陪玩师和评价时间。评价可能在陪玩师详情页展示，但不会公开您的微信 OpenID、游戏ID、收款账号等非必要信息。',
      '陪玩师申请信息：当您申请成为陪玩师时，我们会处理真实姓名、陪玩师名称、联系微信、陪玩类型、个人介绍、音频自我介绍及审核记录，用于身份审核、联系申请人、公开展示经审核通过的陪玩资料和提供接单服务。真实姓名仅用于内部审核和财务管理，不向普通用户公开。',
      '接单与履约信息：陪玩师使用抢单、开打、暂停、继续、完成订单等功能时，我们会保存接单时间、订单状态、服务时长、在线状态、完成记录和评分情况，用于履约管理、服务质量评估、工资计算和争议处理。',
      '收益及提现信息：陪玩师申请提现时，我们会处理收款人姓名、收款方式、收款账号、提现金额、申请备注、审核状态、转账流水号和财务处理记录，用于工资结算、提现审核、人工汇款、财务对账和处理争议。收款账号属于敏感个人信息，仅在实现提现目的所必需的范围内使用，并限制普通用户访问。',
      '客服及安全信息：当您联系客服或发生异常、投诉、退款、账号安全事件时，我们会处理您主动提供的沟通内容、订单信息及必要的操作记录，用于核实情况、解决问题、防范欺诈和保障平台安全。'
    ]
  },
  {
    title: '三、敏感个人信息的处理',
    paragraphs: [
      '真实姓名、金融账户及与财产结算相关的信息可能属于敏感个人信息。我们仅在陪玩师审核、工资结算和提现等特定场景中处理，并采取访问权限控制、最小范围展示和操作留痕等措施。请您在申请陪玩师或提现前确认相关信息真实、准确。'
    ]
  },
  {
    title: '四、信息的共享、委托处理与公开展示',
    paragraphs: [
      '我们不会出售您的个人信息。仅在实现服务所必需、取得您的授权同意、履行法定义务或保护重大合法权益等情况下，向相关服务提供方提供必要信息。'
    ],
    items: [
      '微信及腾讯相关服务：用于微信登录、小程序运行、虚拟支付、消息及平台安全能力。',
      '服务器、云存储及技术服务提供方：用于保存业务数据、头像、音频和保障系统运行。我们要求其仅按照约定目的处理信息。',
      '财务经办人员：仅为审核提现、人工汇款和对账，在职责范围内查看必要的实名及收款信息。',
      '公开展示：经审核通过的陪玩师名称、头像、陪玩类型、个人介绍、音频介绍、综合评分、评价数量和公开评价可能向其他用户展示；真实姓名、联系微信和收款账号不会作为公开资料展示。',
      '法律要求：根据法律法规、司法机关、行政机关依法提出的要求，可能提供必要信息。'
    ]
  },
  {
    title: '五、信息的存储和保存期限',
    paragraphs: [
      '我们原则上在中华人民共和国境内保存业务数据，并在实现本政策所述目的所需的最短期限内保留。账号信息通常在账号存续期间保存；订单、支付、评价、工资和提现记录根据履约、财务对账、售后争议及法律要求保留；审核未通过或不再合作的陪玩师资料在无继续保留必要且无法律义务时删除或匿名化。超过保存期限后，我们将删除或匿名化处理相关信息，但法律法规另有规定的除外。'
    ]
  },
  {
    title: '六、我们如何保护个人信息',
    paragraphs: [
      '我们采取与业务规模相适应的安全措施，包括身份认证、权限隔离、后端保存密钥、传输保护、重要操作记录、数据库访问控制和定期备份。只有履行工作职责所必需的人员才能访问实名、收款账户和提现资料。互联网环境并非绝对安全，如发生个人信息安全事件，我们将按照法律要求采取补救措施并进行告知或报告。'
    ]
  },
  {
    title: '七、您的权利',
    paragraphs: [
      '您可以依法对个人信息进行查询、复制、更正、补充、删除，撤回同意或申请注销账号。您可在小程序个人中心修改可编辑资料；其他请求可通过“我的—联系客服”或微信公众平台公示的运营者联系方式提出。为保护账号安全，我们可能需要核验您的身份。撤回同意不影响撤回前基于您同意已经进行的处理活动；注销或删除请求在存在未完成订单、未结清提现、争议处理或法定保存义务时，可能需要待相关事项完成后处理。'
    ]
  },
  {
    title: '八、未成年人保护',
    paragraphs: [
      '偷吃电竞不向未成年人提供消费、陪玩接单和提现服务。未成年人请勿下单、申请成为陪玩师或提交支付及收款信息。如我们发现未经监护人允许处理了未成年人的个人信息，将依法采取停止服务、删除或匿名化等措施。监护人发现相关情况，可通过本政策载明的联系渠道与我们联系。'
    ]
  },
  {
    title: '九、第三方链接和服务',
    paragraphs: [
      '小程序可能跳转或调用微信、KOOK等第三方服务。第三方独立处理个人信息时，其隐私规则由该第三方负责，请您在使用前阅读相应规则。我们不会因为您拒绝使用非必要第三方服务而限制与该服务无关的基本功能。'
    ]
  },
  {
    title: '十、本政策的更新',
    paragraphs: [
      '业务功能或个人信息处理方式发生重大变化时，我们会修订本政策。涉及处理目的、信息类型、共享对象或您的权利发生重大变化的，我们会通过弹窗、页面提示或其他合理方式重新征得您的同意，不会以默认勾选或沉默方式代替您的主动选择。'
    ]
  },
  {
    title: '十一、联系我们',
    paragraphs: [
      '对于本政策或个人信息处理的疑问、投诉、查询、更正、删除、撤回同意和账号注销请求，请通过小程序“我的—联系客服”或微信公众平台公示的运营者联系方式联系我们。我们将在核验身份后依法处理并回复。'
    ]
  }
]
</script>

<style lang="scss" scoped>
.legal-page {
  min-height: 100vh;
  padding: 24rpx 24rpx 80rpx;
  box-sizing: border-box;
  color: #172116;
  background:
    radial-gradient(circle at 12% 0%, rgba(47, 155, 99, .12), transparent 30%),
    radial-gradient(circle at 88% 10%, rgba(216, 161, 68, .12), transparent 28%),
    #f7f3ea;
}
.hero-card, .notice-card, .operator-card, .section-card, .footer-card {
  margin-bottom: 20rpx;
  padding: 28rpx;
  border-radius: 28rpx;
  background: rgba(255,255,255,.97);
  border: 1rpx solid rgba(39,61,42,.08);
  box-shadow: 0 14rpx 34rpx rgba(39,61,42,.06);
}
.hero-card {
  color: #fff;
  background: linear-gradient(135deg, #173426, #1f7c4b 62%, #45ae72);
}
.eyebrow, .title, .meta { display: block; }
.eyebrow { color: rgba(255,255,255,.68); font-size: 20rpx; font-weight: 900; letter-spacing: 2rpx; }
.title { margin-top: 10rpx; font-size: 40rpx; font-weight: 900; }
.meta { margin-top: 12rpx; color: rgba(255,255,255,.74); font-size: 21rpx; line-height: 1.5; }
.notice-card { background: #fff8e8; border-color: rgba(216,161,68,.22); }
.notice-title, .notice-text { display: block; }
.notice-title { color: #8d651c; font-size: 28rpx; font-weight: 900; }
.notice-text { margin-top: 12rpx; color: #6f6042; font-size: 24rpx; line-height: 1.8; }
.operator-card view { min-height: 64rpx; display: flex; align-items: flex-start; justify-content: space-between; gap: 20rpx; border-bottom: 1rpx solid rgba(39,61,42,.07); }
.operator-card view:last-child { border-bottom: none; }
.operator-card text { padding: 15rpx 0; font-size: 23rpx; line-height: 1.5; }
.operator-card text:first-child { flex-shrink: 0; color: #7d877a; }
.operator-card text:last-child { flex: 1; text-align: right; font-weight: 800; }
.section-title { display: block; color: #172116; font-size: 30rpx; font-weight: 900; }
.paragraph { margin-top: 16rpx; }
.paragraph text { color: #4f5d50; font-size: 24rpx; line-height: 1.85; }
.item-list { margin-top: 14rpx; display: flex; flex-direction: column; gap: 14rpx; }
.item-row { display: flex; align-items: flex-start; gap: 14rpx; padding: 18rpx; border-radius: 18rpx; background: #f7faf4; }
.item-index { width: 38rpx; height: 38rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 50%; color: #fff; font-size: 20rpx; font-weight: 900; background: #2f9b63; }
.item-text { flex: 1; color: #4f5d50; font-size: 23rpx; line-height: 1.75; }
.footer-card { color: #7d877a; font-size: 22rpx; line-height: 1.7; text-align: center; }
</style>
