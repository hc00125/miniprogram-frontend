<template>
  <view class="legal-page">
    <view class="hero-card">
      <text class="eyebrow">USER AGREEMENT</text>
      <text class="title">偷吃电竞用户服务协议</text>
      <text class="meta">版本：1.1　发布日期及生效日期：2026年7月15日</text>
    </view>

    <view class="notice-card">
      <text>请您在注册、登录或使用服务前认真阅读本协议。您主动勾选并登录、下单、申请成为陪玩师或继续使用相关服务，即表示您理解并同意受本协议约束。</text>
    </view>

    <view v-for="section in sections" :key="section.title" class="section-card">
      <text class="section-title">{{ section.title }}</text>
      <view v-for="(paragraph, index) in section.paragraphs" :key="index" class="paragraph">
        <text>{{ paragraph }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
const sections = [
  {
    title: '一、协议主体与适用范围',
    paragraphs: [
      '本协议由您与偷吃电竞小程序在微信公众平台公示的认证主体共同订立，适用于小程序提供的浏览、点单、派单、接单、支付、履约、评价、陪玩师申请、收益结算和提现申请等服务。'
    ]
  },
  {
    title: '二、账号注册与使用',
    paragraphs: [
      '您应使用本人合法持有的微信账号登录，并确保昵称、头像、游戏ID、联系方式及其他提交资料真实、准确、合法。您应妥善保管账号，不得出租、出售、出借或以其他方式提供给他人使用。因您主动泄露账号、设备或验证码导致的风险，由您依法承担相应责任。',
      '您发现账号被异常使用时，应及时通过小程序客服渠道联系我们。平台有权在合理核验后采取限制登录、暂停交易或其他必要保护措施。'
    ]
  },
  {
    title: '三、点单、支付与履约',
    paragraphs: [
      '商品、规格、服务人数、时长、价格和可用范围以您下单时页面显示及订单记录为准。订单在陪玩师接满后进入支付环节，支付成功后进入待开打或进行中状态。',
      '续单会生成与原订单关联的独立支付记录，支付成功后计入原订单的累计购买时长和累计金额。未支付或已取消的续单不计入已购买服务。',
      '您应按约定提供正确的游戏ID、队伍码或KOOK房间信息，并配合完成服务。因您提供的信息错误、未按时上线或游戏及第三方平台异常造成的影响，双方应根据实际情况协商处理。'
    ]
  },
  {
    title: '四、陪玩师规则',
    paragraphs: [
      '申请成为陪玩师应提交真实资料并通过平台审核。陪玩师应按约定时间上线、保持文明沟通、遵守游戏规则及平台规范，不得使用外挂、代充、盗号、欺诈、骚扰或其他违法违规方式提供服务。',
      '陪玩师的收益根据实际完成并确认的订单计算。平台默认抽成比例、审核期、单笔订单调整、冻结及提现规则以收益中心和后台记录为准。当前默认抽成为16%，订单工资在完成后进入8天审核期，无退款、投诉或其他异常时转为可提现鱼干。'
    ]
  },
  {
    title: '五、评价与内容规范',
    paragraphs: [
      '用户可对已完成订单中的陪玩师提交一次真实评价。评价不得包含违法、侮辱、诽谤、骚扰、隐私泄露、广告或与服务无关的内容。同一订单对同一陪玩师不得重复评价。平台可对明显违法违规内容依法采取隐藏、删除或限制账号等措施。'
    ]
  },
  {
    title: '六、退款、投诉与异常处理',
    paragraphs: [
      '发生未履约、服务中断、支付异常、退款、投诉或争议时，您应提供订单号和必要证明。平台将依据订单状态、服务记录、支付记录和双方说明进行核实。已付款订单的取消和退款需结合实际履约情况处理，不以单方删除订单或退出页面视为退款完成。',
      '存在未结争议、退款、投诉或安全风险时，平台可暂缓陪玩师工资审核或提现，待核实后恢复、调整或冲销相应收益。'
    ]
  },
  {
    title: '七、禁止行为',
    paragraphs: [
      '任何用户不得利用本小程序实施违法犯罪、赌博、诈骗、洗钱、盗号、恶意退款、虚假交易、刷单、绕过平台私下交易、攻击系统、批量注册、爬取数据或侵害他人合法权益的行为。平台有权根据风险程度采取警告、限制功能、冻结订单、停止服务或向有关机关报告等措施。'
    ]
  },
  {
    title: '八、未成年人保护',
    paragraphs: [
      '本小程序不向未成年人提供消费、陪玩接单和提现服务。未成年人请勿下单、支付、申请成为陪玩师或提交收款账户。发现未成年人使用时，平台可取消订单、停止服务并依法处理相关信息。'
    ]
  },
  {
    title: '九、知识产权与第三方服务',
    paragraphs: [
      '小程序中的界面、文字、程序和自有素材依法受保护。未经许可，不得复制、传播、出售或用于其他商业用途。游戏名称、角色、图片以及微信、KOOK等第三方标识的权利归相应权利人所有，第三方服务适用其独立规则。'
    ]
  },
  {
    title: '十、服务变更与责任限制',
    paragraphs: [
      '因系统维护、网络故障、微信或游戏平台调整、不可抗力等原因造成服务短暂中断时，平台将尽合理努力恢复。法律允许范围内，平台仅对因自身过错直接造成的实际损失承担相应责任，不对用户自身操作、第三方平台或不可抗力造成的损失承担不应由平台承担的责任。'
    ]
  },
  {
    title: '十一、协议更新与联系',
    paragraphs: [
      '业务规则发生变化时，我们可能更新本协议。涉及您重要权益的变化，会通过页面提示等合理方式告知，不会以默认勾选代替您的主动同意。对于协议、订单、投诉或账号问题，可通过小程序“我的—联系客服”或微信公众平台公示的运营者联系方式联系我们。'
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
    radial-gradient(circle at 12% 0%, rgba(47,155,99,.12), transparent 30%),
    radial-gradient(circle at 88% 10%, rgba(216,161,68,.12), transparent 28%),
    #f7f3ea;
}
.hero-card, .notice-card, .section-card {
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
.notice-card { color: #6f6042; font-size: 24rpx; line-height: 1.8; background: #fff8e8; border-color: rgba(216,161,68,.22); }
.section-title { display: block; font-size: 30rpx; font-weight: 900; }
.paragraph { margin-top: 16rpx; }
.paragraph text { color: #4f5d50; font-size: 24rpx; line-height: 1.85; }
</style>
