const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const Vue = require('vue');
const { renderToString } = require('@vue/server-renderer');
const { parse, compileStyle } = require('@vue/compiler-sfc');
const { baseParse, compile } = require('@vue/compiler-dom');
const postcss = require('postcss');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const digest = s => crypto.createHash('sha256').update(s).digest('hex');
const frozen = {
  "src/pages/boss/home/index.vue": {
    "script": "c606bfe5be793560e338032613e8bac165f98b9b7ff322e1f12121a0af365b5c",
    "semantics": {
      "bindings": "7cc0f5a091ebbf820e304256240c01438602a3da3914708674a6ec2e84143bf9",
      "controls": "eb79b9baaf72a93675c6b273eb581eb4a81f93bfbf2c507107b3a38cdae9132c"
    }
  },
  "src/pages/client/national-bounty/index.vue": {
    "script": "81d334c3541cd3fb600b93ee408f5f378112baccaad60884283efb7f80688dc4",
    "semantics": {
      "bindings": "6ff50a2276dc78986a4d44d2ab716142149052090f4c8007b870b4802bc3b192",
      "controls": "421a3dcc72d8e2391b815f3deab66679ae8b1fdaf0d77c57fa94cbd3fbfdebcb"
    }
  },
  "src/pages/client/popular-announcements/index.vue": {
    "script": "ee1c33dea97f879d4f7b6e59ec760728ba10b14b8a181e17f81d482b4e61c561",
    "semantics": {
      "bindings": "4adf68ebd5e397dbd70b84c759bd4e5c24c973d3f541fae7369845cc50564549",
      "controls": "e681fe98314a33df019921e3f54338d2a0f1b8a471c61ac814e36e590b825d20"
    }
  },
  "src/pages/client/patronage-announcements/index.vue": {
    "script": "3fdae3d4728ac602c2279426ea5687cb0d68902a91926bd5ed880234484b951b",
    "semantics": {
      "bindings": "f219633b8b969f6c1aac8b8ce9ab57cd76fc1110afdd0c158cc546e9a454a83f",
      "controls": "287aeec44431df7de4ba8adef2749198c8d70694e22103b5e8699d51936c5eeb"
    }
  },
  "src/pages/client/patronage-wall/index.vue": {
    "script": "b37f4a7cb6ae0fa02aec08e923d7e1d138ddfea7d79a43220091133ecc9489bf",
    "semantics": {
      "bindings": "bec927005cbb05bbf7fa7dd407ddd6bcd7a486255fb54c5494af8594b34c1f27",
      "controls": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"
    }
  },
  "src/pages/client/announcements/index.vue": {
    "script": "e8e88c0020121dff3ba61f7451fe7f094899595689b86ed59cb1f07451db34c6",
    "semantics": {
      "bindings": "3b9c76fdef7cfa6d9ae6b6bae6e4c70538dc832a3636e877ca9c1817531808e9",
      "controls": "68aaff39b1bfe2fb8895abec74b317ecd856aa734d02f73be662bfd720dc2bdd"
    }
  },
  "src/pages/client/history-claim/index.vue": {
    "script": "e99e22b2050a048376c92ae3efea691e96d894f8fa73ab4ace0216ecc71816ab",
    "semantics": {
      "bindings": "d65c2015b6a680db352ce77754369262068247418a0d8ea0e58e254c07e9f90f",
      "controls": "0d3f3f2c6cc6b633c648b6dd80bd9b2af9003fbe8ec22389c0530859a027bb65"
    }
  },
  "src/pages/client/benefits/index.vue": {
    "script": "010f8412d7a90d4f06b389ee5164e9a8ac780cc3c82459e9f661dd1aba757cd3",
    "semantics": {
      "bindings": "a0949e9e09e3cc294745ae9a2512d20b527def032081fa66fd15f90f8eeda31e",
      "controls": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"
    }
  },
  "src/pages/client/history-order/index.vue": {
    "script": "44397c4c602d8051f53f264897a3300972d0a6ed3d3c7c49b5c74fbf794c3cad",
    "semantics": {
      "bindings": "65e4cc2c7fbbdd1137feb5661c70b0ed71ade64113076c5278e99b3ee4d9c049",
      "controls": "d167c6bbce3f4614ab11377da2da73442744634561b81a62a7100233607442b7"
    }
  },
  "src/pages/client/complaints/index.vue": {
    "script": "b01466bddf7e9ee6fde6eb25dba0c56a5f7f380e60253cca0bb60ff207dedfe9",
    "semantics": {
      "bindings": "1e909598578b143e82e6281bb57159de918ca89691bb735dc56c0fdb86a6b94c",
      "controls": "2ccd8c5b4ede590f0fbd4374ff167b38b7d7257074ac2170dc68e0ab49ff1b11"
    }
  },
  "src/pages/client/complaints/create.vue": {
    "script": "7731b2e17cd0a26e36c1f3531cbf0dfd447078bf1a68866b04b31120f2c5f8b2",
    "semantics": {
      "bindings": "aaf0b215c6254c6117ba0cd040fbe9b082d8d663adede0eff8ffad42f5990c62",
      "controls": "62671e1d362caad71be8409dfa48ccefceafd35c573e2b3a4f08b747a25bfe9d"
    }
  },
  "src/pages/client/complaints/detail.vue": {
    "script": "626b04e7e10985ee62e53e836b83ce641c4706ac5f6aecd64541215c8e30b7eb",
    "semantics": {
      "bindings": "8db475aac65b6f863d153954b5de58fa8a94c2771c4f8e9d01852dbc6f1aa023",
      "controls": "4491be7cb5f8f3e101aa065e903588d54c61f70f84538bc9a5ccc57ee45172f9"
    }
  },
  "src/pages/boss/order-notice/index.vue": {
    "script": "44105c479ca16859eb6297f73d3e35e2ba7e6a684ac7fe4182abb6fea7c38abc",
    "semantics": {
      "bindings": "32d0efc7cdc54da3949bed5258c98399152b9d586d6d2cace8ac341390f33aed",
      "controls": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"
    }
  },
  "src/pages/shop/category/index.vue": {
    "script": "c26e774a9e66ffef6caf18c7eba0b7ac359d3bc283f15ee812cb152c9a40bd25",
    "semantics": {
      "bindings": "ed6b87641a1bac1312786835985a4be237aed78d3fbe379184ba97320a443ea6",
      "controls": "22e04140c46f31c3b9a72bc2ded3fc39133dfcb5caa337ec5a7b05500c52ce7f"
    }
  },
  "src/pages/shop/detail/index.vue": {
    "script": "34f3218ed1401986a9b407d62c187b48723b8ca25919257e214a75aeb14e8a7d",
    "semantics": {
      "bindings": "1a365b6297a4469227d3bbd5d63dc0416e7d913b926c617afcb4d3808ca5d6e7",
      "controls": "1e0834800acf85fd1ae341eae8c87d733f9aa225088c6a3e864863274d85011a"
    }
  },
  "src/pages/shop/cart/index.vue": {
    "script": "81f4d3eacb0c861a1792f8c53f6f8ea16b44205f1ddab59510d7d9210450ea32",
    "semantics": {
      "bindings": "4baa8b79047cda31d9b959cf6b3b1b5ed5892a74a8c90ae52909a71146a3be62",
      "controls": "5888b47ae58c4ab9b1b255392904c6cd6e0b9868c4118eadd9ed6d6b6f969343"
    }
  },
  "src/pages/shop/checkout/index.vue": {
    "script": "2278c54b7819419a805455fef2b815022d244cdf02fb12132342327ccb49c6af",
    "semantics": {
      "bindings": "e6a6652933b863f065fcb204b244b2c933c6c0b3d4718d9635331d8a1516649e",
      "controls": "200b2a324add56248046836192e85a604cb51c492106b109952c6fccbc769333"
    }
  },
  "src/pages/boss/query/index.vue": {
    "script": "93c3b1cbf892d46943c3a0b2d21b5c5d7bc1b6aae9bc656b873be2e06ec9a7b4",
    "semantics": {
      "bindings": "6b1dda45d0704416eb4a153c6a4b0556a53f85b49c95e1f791469ac37bd61bbf",
      "controls": "e3bec31e4ecc08db7a620b3732cfe189a726aa59ec1112166f019b69711c08ab"
    }
  },
  "src/pages/client/rankings/index.vue": {
    "script": "73093d0556857a64f5222e47802886b62221cccef712796ff290872683bab999",
    "semantics": {
      "bindings": "0d6c894441e81ab6ee9d3cd5a30b8079af8fc39fc5fb61dc14b3370a5c4b39ee",
      "controls": "7f41ff74e081256d608693f91b60a0c02076f941b814e4dfc21bf7eb57cc14c3"
    }
  },
  "src/pages/player/list/index.vue": {
    "script": "13cad7276277d14c434b26278e9295be81ae7a17cbe1052c3e4de021bcb0d685",
    "semantics": {
      "bindings": "069c1baa6a1a06a948fb9e93e1eaf593f8779e43274323853162548f7c56198b",
      "controls": "94587f14571ff15bebdb4bd16ba1adb9d0f21a0c1754b65489c58f4ee3872a06"
    }
  },
  "src/pages/player/detail/index.vue": {
    "script": "0bd999fd63a72509e4da3c2806fc02d47b0fc80c66c057a60da60b88c2ffe249",
    "semantics": {
      "bindings": "aa47a9fc837c01e403e9652487b37438cec3b9ac2593746c0f398fb46d4ca7c7",
      "controls": "8e0c9170d173e14be27f3cc6ab42c28c8af0303da34fd8b5051dd450dc1cf643"
    }
  },
  "src/pages/client/gifts/index.vue": {
    "script": "0a57b3ed96d99a038d0dbfa6b1e7c81e8a0102f6921f85dfc061b0bb3770e94e",
    "semantics": {
      "bindings": "4cf5237c6d65ff1919ff713b7a8353b6c6580dce8ee352e23a823f1a422da7f8",
      "controls": "be54af5eff4535b335ff621141e8668bddb3990252a0d92823b6e7eb13a02b5d"
    }
  },
  "src/pages/client/profile/index.vue": {
    "script": "ef64984b7a386af7f28f4546310bc28f7407b619b6225a4fd55f231fe4dcde51",
    "semantics": {
      "bindings": "103e043edd8639c33caf58f41328a46fab58f9fcad1155acf06101f712c9bd95",
      "controls": "c0716e32af7854fcd76e94d0197de5cb7accc8af828e1541d4606b94cbca582a"
    }
  },
  "src/pages/boss/waiting/index.vue": {
    "script": "17e63e92faba941f2e8ae42fc916795f4683a8abd1505553815424f1748c5f68",
    "semantics": {
      "bindings": "45ddca34a16dc7d50e11c89a540eb9396de08bad23582ede670bde236d86863b",
      "controls": "3d2c8814ca23b2a1081bbb9834b8c38a6199034b4659070c08eb0a9d169c543f"
    }
  },
  "src/pages/boss/surcharge-payment/index.vue": {
    "script": "c022a37aee380586e78d33a16afa0c7d2bd2d4cd0c256f5a83bee3644f5be9dc",
    "semantics": {
      "bindings": "d267e6250010b5f211556129d02d06e3fd63ff5cefd6d2c401f50b3b308f9457",
      "controls": "5f20f8fb396202632d0f3d4b5f1b0ac0d62ce7a6f5923fd495b277077879394a"
    }
  },
  "src/pages/client/login/index.vue": {
    "script": "1db73e6b97c0f87c89ca6e11c426aed99d0078ed85ffcd6376e22b560f2db0c9",
    "semantics": {
      "bindings": "048f4369bb93882723b64cbc1ca44b2ab3933ba9b3ed6d539b416bbd492ce2ec",
      "controls": "4175c12a591d348d208f902f9957d33d23d60c8fc6626049594b5c0fb5cf0530"
    }
  },
  "src/pages/legal/privacy/index.vue": {
    "script": "27ddf77b6f09df9c64701a340d4b26169cdf9dd41ada6622c4eb6c160a732e1b",
    "semantics": {
      "bindings": "402091783468c1036bb2bd61ff3b945e387a75ee1568cded4588c1c43b1d8ad0",
      "controls": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"
    }
  },
  "src/pages/legal/user-agreement/index.vue": {
    "script": "29a1e5393a278f54c71f3d57819fa22a535a184e5bed97fd4ec5eee0fc335e69",
    "semantics": {
      "bindings": "d98c85d14070bffb7b75f72073a249c747d89e301b459474fac55bf45937fdda",
      "controls": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"
    }
  },
  "src/pages/client/account/index.vue": {
    "script": "52b41e2bf1c4aab2ae3c0a021bb90205f002be8f0ce5dd657b6287f8303ee862",
    "semantics": {
      "bindings": "56061ec2376956bcddf4883568017e19d8f68698fc4a0f4df89134fb99e40f73",
      "controls": "bf629a4bcdd4a40f12938d389e0ec11f9d8e57cc5ec79915fb48fc94486e9bc6"
    }
  },
  "src/pages/client/growth-records/index.vue": {
    "script": "f39e396785a32d91ae6b36c104ac0b0644249b5f0b4f20e762191f8af4956804",
    "semantics": {
      "bindings": "d273ee4ae4c71e8bcc9512bb321f9d3cd273e5e137f7a5e90c5bc30e9a979614",
      "controls": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"
    }
  },
  "src/pages/client/settings/index.vue": {
    "script": "2ca274b95e095d77b287082253e97f64731a986d6c6079816ed4bb4bd7a73663",
    "semantics": {
      "bindings": "faa8c87aad64dd4bef9754036914964dd2506b81520fa7dce57446bf9c8e6626",
      "controls": "8b19c9470cb5cb14b968ff8797efacb46155d4ffcc281cce28410e8418dd7f5e"
    }
  },
  "src/pages/client/customer-service/index.vue": {
    "script": "2a0b38e1451630db63040fe96007aeb75b15793c25a38d9c5027f0c582af3ba0",
    "semantics": {
      "bindings": "1027fc761314b703d40d41b5bc44115d7bb5ea45d51b86aa22c903197c9241fb",
      "controls": "94aa99d84c3fb7f9d25a44a321decf8b3849364bc1b18f17cdc196f4251d1e4f"
    }
  },
  "src/pages/client/wallet/index.vue": {
    "script": "27dcec1e1ea772a43d26e21b550b54d35a12fe02f05d80495ebb14c25ae70218",
    "semantics": {
      "bindings": "58de0204956c8cb5337f21412aaf52bcea1721ec02cbc7b26238e0353e0e131f",
      "controls": "5e95ccac8a3b9bf9d5c9121bc581058d29e0c2ebe37c89832effc2f3433e1ae8"
    }
  },
  "src/pages/client/recharge/index.vue": {
    "script": "0a934a3aa7cf6fd376d3185b2b5abb7706d55b80d8c89bc86a750f5fab4ab084",
    "semantics": {
      "bindings": "6d74458fc299d7521b98d1c347f0830bcb738a6c657ac03f2b6f05bea1843eae",
      "controls": "2396de6aa972bb4999acb9f6c889afb9b6fc715ed96002fdf85cb0df3f7fd00a"
    }
  },
  "src/pages/player/apply/index.vue": {
    "script": "f4305ed730fa86cb1bfea65d60efa92ce9ab1a99726d3857f461bc0bd447d612",
    "semantics": {
      "bindings": "8f68bfbec708c4412d8e3c97492eb2a9d9aba9ea17ddb9cd8f05146a251e6f95",
      "controls": "ca382fe15a4c962391856690c149e4fcc5caae8359ae3b700098556fed92ee6d"
    }
  },
  "src/pages/player/profile-settings/index.vue": {
    "script": "4ce7e366550e91e7adb2588b365bdae7f6241417dde1a56291c2eab6563a19f5",
    "semantics": {
      "bindings": "c6e3712b8b7f95d058061b486da8782d87d38c8f4f96df3badd41aa57b2c5573",
      "controls": "42769a50d4365993c87234b8205bbfd6949a4efcaf2940f6fd1aaeff5a920234"
    }
  },
  "src/pages/player/service-management/index.vue": {
    "script": "49d3a1872e809e0b7c541c463a7dd0ca6c99102cbfeff9b131eded4a30438225",
    "semantics": {
      "bindings": "db74ef7c47d5c74d925f18101337a066aa3a6aec4d956c9837eafcdf563d3565",
      "controls": "9006df407b0a518ca29afc2cea0fc1970ca1b82a1d20faa79cfae82c657e925c"
    }
  },
  "src/pages/player/escort-qualification/index.vue": {
    "script": "34c9ed5cf213bbb22658616cb9438c3a73e3b744305ca57045793f51c9bada2b",
    "semantics": {
      "bindings": "d25383726f67d5a50ccbd1c990988519dc1e1f4d70f861c9a6a46753b13f1045",
      "controls": "1b20ccc7c226ebf1f7128d06cfd503e10fdeedb7d20e83471267e12241ef8612"
    }
  },
  "src/pages/player/kook-binding/index.vue": {
    "script": "19444af8e3ae8079a9ff6e745ef7e7f34a50bf56606df026d29a77fc4a78e0b4",
    "semantics": {
      "bindings": "4097cbef7e3921b281d13acbeb19dc45af6e4feedf76f10d77b302573dc77032",
      "controls": "dd13c2801db0ce0335a00731b077ca688e1d79255a90b5efe254b333ff571098"
    }
  },
  "src/pages/player/grab/index.vue": {
    "script": "d8e6c2529682fd5d08cc03bf18cbe839f26d87ed62942268640a3ee9f9f5ef35",
    "semantics": {
      "bindings": "7bd5e378a6b430d7c368f6560d22659c64963dbb181fa4b7c3b83fd28a11c7a3",
      "controls": "77edd6c054515c48e8a313f30c0fd4d5e5d76c47c93f19a27c2fa800923f2850"
    }
  },
  "src/pages/player/my-orders/index.vue": {
    "script": "71a6a9043796b7c0cc51a05af2e3d8434757acb4b44c92d6ff495923ccbeeed6",
    "semantics": {
      "bindings": "0a8fb3a1e6045b49ac7414a4e090d3c8010512558ecac5915c3f800cc4393e8c",
      "controls": "bcac0390fa5cf3d8eb4f41673c1bf623636876f33e934be3695b4fd017d3de0d"
    }
  },
  "src/pages/player/earnings/index.vue": {
    "script": "a77fb2a699a94a4941836d9a130e553c94032d62b7ddc55037b8d2282f18e2be",
    "semantics": {
      "bindings": "f79ac41c5511c125c17b28fb2751a7a9a485f3128bf876bc0cf03fa2ee8a25a9",
      "controls": "35879642b4192ab914eaa9fde382235d2178702add5d126ad130db5413b7e1a6"
    }
  },
  "src/pages/client/help/boss-notice.vue": {
    "script": "44105c479ca16859eb6297f73d3e35e2ba7e6a684ac7fe4182abb6fea7c38abc",
    "semantics": {
      "bindings": "32d0efc7cdc54da3949bed5258c98399152b9d586d6d2cace8ac341390f33aed",
      "controls": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"
    }
  },
  "src/pages/client/help/player-rules.vue": {
    "script": "b326fe8223495e76bc4e41f2625ffb815a2d682fecb96f18ffcbb5775c249fd8",
    "semantics": {
      "bindings": "40374ce77aec356b5d5798b0397103e4c910bc8d37a2c3d4ce4e1be44cc23c92",
      "controls": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"
    }
  },
  "src/pages/client/help/index.vue": {
    "script": "770cd9b07cfcfe7c81c46dd82013820f5d6d6037316d2e6050add90529649723",
    "semantics": {
      "bindings": "f0128483c52a4e8fd1f4ff1a980565072f9288a4eb7456f9fb92365460efbdd9",
      "controls": "c42552e1fec929a6f7b3770c2c076ab88b37c45999f5355be0054357adb3f408"
    }
  },
  "src/pages/client/help/player-guide.vue": {
    "script": "d3ae7c1a9f7920db49495861db3b8cc638534b96d93c914f5279563db2b8a8ab",
    "semantics": {
      "bindings": "67ab81da4499107f0d26d86a3fa9762725928899acc5205d85b241a036bce05a",
      "controls": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"
    }
  },
  "src/pages/client/help/user-guide.vue": {
    "script": "0d9fb2030f8cc88255c686a092f0ef766d6a60c4d78de5a1a1a9a05b63abb4d1",
    "semantics": {
      "bindings": "67ab81da4499107f0d26d86a3fa9762725928899acc5205d85b241a036bce05a",
      "controls": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"
    }
  },
  "src/pages/client/help/conduct.vue": {
    "script": "7fc0ad7bd8aa7d03078219d8908525c40f2cc615e7da2c7bcf3e4e1c26130bb3",
    "semantics": {
      "bindings": "67ab81da4499107f0d26d86a3fa9762725928899acc5205d85b241a036bce05a",
      "controls": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"
    }
  },
  "src/pages/client/help/usage.vue": {
    "script": "739298d6b10ab57e9903560f085dafc93244d7ae85205b9e4e7b6f4ed85bf493",
    "semantics": {
      "bindings": "67ab81da4499107f0d26d86a3fa9762725928899acc5205d85b241a036bce05a",
      "controls": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"
    }
  },
  "src/pages/client/help/order-violations.vue": {
    "script": "a37b4275f9ed10ab8b0d0089811bf6d76f997fa3e54915cfe116bf530b2afc03",
    "semantics": {
      "bindings": "67ab81da4499107f0d26d86a3fa9762725928899acc5205d85b241a036bce05a",
      "controls": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"
    }
  },
  "src/pages/client/help/aftercare.vue": {
    "script": "f2dcefa26aaeb38a1be2f7bc477b063fb7c0f29bf137265a49e6b426ad4eb7a7",
    "semantics": {
      "bindings": "67ab81da4499107f0d26d86a3fa9762725928899acc5205d85b241a036bce05a",
      "controls": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"
    }
  },
  "src/pages/client/help/recharge-refund.vue": {
    "script": "85e56f3c081a03838229b03e96611c4a7efdc0bab150f9c8f7c1f3182c17ef9b",
    "semantics": {
      "bindings": "67ab81da4499107f0d26d86a3fa9762725928899acc5205d85b241a036bce05a",
      "controls": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"
    }
  },
  "src/pages/client/help/player-agreement.vue": {
    "script": "6e3c050f8e1331c69c36b6b7e1a091995b3e29e52c36c3bc5b7251127c686dd6",
    "semantics": {
      "bindings": "67ab81da4499107f0d26d86a3fa9762725928899acc5205d85b241a036bce05a",
      "controls": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"
    }
  },
  "src/components/PatronageWallPanel.vue": {
    "script": "db250455c17838b4a7280b8f2b5dc5a3b3c7e1718620a2669ff321861b319823",
    "semantics": {
      "bindings": "5f1a73958614675fcb8092a07083e5b84f536e5d5a5398c7b54fbe98dd455be5",
      "controls": "49b1cd0c1c0b6388df2f9c70b36e9b2df353eaf19f15f49d486a07dda83f4727"
    }
  },
  "src/components/OrderReplacementCard.vue": {
    "script": "72bf7c75f82a685434f63d311ad713fd8ebb72c0699f66c39332b87f4441a50e",
    "semantics": {
      "bindings": "abf79695eecc0e09cf50fc8b74818f3de2b387bbf5dc96c14829d9f2539d69a5",
      "controls": "98c1c8557df015798baf9c226ead216bfdb7b26a86bc7ab6798c8dd43f779b1e"
    }
  },
  "src/components/BossNoticePoster.vue": {
    "script": "05b9bba4c812afb3403938e83a5586f9c390dcae4585464c5f0025b391ce659f",
    "semantics": {
      "bindings": "9b7d44b73c96073d44024762d4d9be0201a81a7c63847d41a9101d4ad99cd43b",
      "controls": "c5b7835435b94fd123ae85bc1d0200d76d4dea0921360bbbe54ffb64dd51dad1"
    }
  },
  "src/components/ProductCover.vue": {
    "script": "d4dc3ecf9079dfba35ca6727c14692ed012697bb51cc70b6b8217270a51bda00",
    "semantics": {
      "bindings": "e23514f0270da88dcc66378e6c9605af01992ceaeb12b1bf480afadc1f7f45fa",
      "controls": "32647b46c6fae372f7a7be20a4cd8efa6b68ac08b92d266bc21f4a6128a0c0fc"
    }
  },
  "src/components/PatronageServiceDurationSettings.vue": {
    "script": "44d511f6cfd59e52bc18a7d35bace135ce947e4128ed1f3d643becbc588d6982",
    "semantics": {
      "bindings": "71229f4c42d49f91403b97aab1f403aef1cf768212d08e939af8aa4be93019f2",
      "controls": "a2a1697d9b7ed5ed5bfd7f6f37f7212821cda1d5334833f364d38ec67083ddc0"
    }
  },
  "src/components/ThemePicker.vue": {
    "script": "33aed817d103c8451d823aba6609a012b2eda8fbc90d85db2ebed6dfdd6cacb3",
    "semantics": {
      "bindings": "d90dbe4c64efa5ecdc838f3abcfa8eaa8f4df8c43bf556f0291661633b68945e",
      "controls": "33479f6083e1e0b7babc8b27b94a54fa5acb2d99873ee42647a2e7bffee12500"
    }
  },
  "src/components/HomeAnnouncements.vue": {
    "script": "3b09c6f1896909a4ac1daf0f37d8b1994fd6f5a5a96213ed61b7b9d40b246d0a",
    "semantics": {
      "bindings": "aae4decf4db8361989e6c038716e7547c00ad61e76f83f030a9aa584c301e285",
      "controls": "77640b54c80514bd7c1d11fc64f1b14d35d9fc0a6789ab573f6cba788ff570bd"
    }
  },
  "src/components/VipSummaryCard.vue": {
    "script": "c76497c2e23f60910519530ec5fb41faa0508e180f8c7b67767f92cb70687f5e",
    "semantics": {
      "bindings": "1fb72ba07449a5b1b59d86fdcaeda043afdf6240d7c342f5af69927b6361f063",
      "controls": "a5849881d996847784c4b236f80a91854c468178a5a71948d08354bb292c6f10"
    }
  },
  "src/components/MainBottomTabs.vue": {
    "script": "60483766c0496392e177ca3ef0f3615e65757760fc67d953cffff650abb1582f",
    "semantics": {
      "bindings": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
      "controls": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"
    }
  },
  "src/components/orders/OrderSurchargeSheet.vue": {
    "script": "d954e75740e62561d8c45eb5473fccd69a7411891127c66108a61dd3a9b408a0",
    "semantics": {
      "bindings": "9431a1429b193eded0f76c7b0550d9953348c214b8a3b16cb8dabf39b77bcfa0",
      "controls": "b4e14eeff59aea7059f3112450a0dc76347a4574c06ac2cd769acb3167b9e15c"
    }
  },
  "src/components/orders/OrderSurchargeHost.vue": {
    "script": "21229b77bed352ee128bdf62776ee207e8bc5e369ff95ce39743aeb02825d5c5",
    "semantics": {
      "bindings": "0a90dd9037dbb6b55c5c530c1465f60228183bc77dc6d25fcf0b58b902885312",
      "controls": "7089cd0d5eb0cc2df61d61eb4a725285bc13dd9f6fc640e5216e7c45c98fd293"
    }
  },
  "src/pages/client/help/HelpArticleContent.vue": {
    "script": "3d69d650ae1d10f16d2d3ef7b2b7c17f6afd207a8ca9a623578feef5a0ea067e",
    "semantics": {
      "bindings": "c9f8713a59f4aea3e1385b78e810432557226ffebf3d562bfc7980fad391bff1",
      "controls": "bb3c2c118bd938356130b70dbe663eecb0022e8a70e324239e99a75cddd60afc"
    }
  }
};
function descriptor(p) { const result = parse(read(p), { filename: p }); assert.deepEqual(result.errors, []); return result.descriptor; }
function walk(node, visit) { visit(node); for (const child of node.children || []) walk(child, visit); }
function semantics(template) {
  const bindings = [], controls = [];
  walk(baseParse(template), node => {
    if (node.type === 5) bindings.push(['interpolation', node.content.content]);
    if (node.type === 1) {
      for (const p of node.props) if (p.type === 7) bindings.push([node.tag, p.name, p.arg?.content, p.exp?.content, p.modifiers]);
      if (['button', 'input', 'textarea', 'picker', 'switch'].includes(node.tag) || node.props.some(p => p.type === 7 && p.name === 'on')) controls.push([node.tag, node.props.map(p => p.loc.source)]);
    }
  });
  return { bindings: digest(JSON.stringify(bindings)), controls: digest(JSON.stringify(controls)) };
}
function fragment(p, className) {
  let result;
  walk(baseParse(descriptor(p).template.content), n => { if (!result && n.type === 1 && n.props.some(p => p.type === 6 && p.name === 'class' && p.value?.content.split(' ').includes(className))) result = n.loc.source; });
  assert.ok(result, `${p}: ${className} exists`); return result;
}
async function render(template, state = {}) {
  const { code } = compile(template, { mode: 'function', prefixIdentifiers: true, isCustomElement: () => true });
  const render = new Function('Vue', code)(Vue);
  const publicState = Object.fromEntries(Object.entries(state).filter(([key]) => !key.startsWith('$')));
  const app = Vue.createSSRApp({ setup: () => publicState, render });
  app.config.globalProperties.$appThemeStyle = state.$appThemeStyle || '';
  return renderToString(app);
}
function css(p) {
  if (p.endsWith('.css')) return postcss.parse(read(p));
  const d = descriptor(p);
  return postcss.parse(d.styles.filter(s => !s.src).map(s => {
    const r = compileStyle({ source: s.content, filename: p, id: 'general', preprocessLang: s.lang, preprocessOptions: { silenceDeprecations: ['legacy-js-api', 'import'], importer: url => url.startsWith('@/') ? { file: path.join(root, 'src', url.slice(2)) } : null } });
    assert.deepEqual(r.errors, []); return r.code;
  }).join('\n'));
}
function rule(p, selector) {
  let values = {};
  css(p).walkRules(r => { if (r.selector.split(',').map(s => s.trim()).includes(selector)) r.walkDecls(d => values[d.prop] = d.value); });
  return values;
}
test('all general-owned SFC scripts, reactive bindings and controls remain byte/AST identical', () => {
  assert.equal(Object.keys(frozen).length, 65);
  for (const [p, contract] of Object.entries(frozen)) {
    const d = descriptor(p);
    assert.equal(digest([d.script?.content || '', d.scriptSetup?.content || ''].join('\n')), contract.script, p + ': script');
    assert.deepEqual(semantics(d.template.content), contract.semantics, p + ': template behavior');
    compile(d.template.content, { mode: 'function', isCustomElement: () => true });
  }
});
test('help index prioritizes the eight actionable rule entries without redundant introduction', async () => {
  const p = 'src/pages/client/help/index.vue';
  const html = await render(descriptor(p).template.content, { appThemeStyle: '--ui-bg:#f7f3ea', uiIcons: { chevron: '/icon.png' }, go() {} });
  assert.equal((html.match(/<button/g) || []).length, 8);
  assert.match(html, /陪玩操作手册/); assert.match(html, /退款规则/);
  assert.doesNotMatch(html, /偷吃电竞|操作手册、服务规范和异常处理，按需要查阅/);
});

test('help article keeps disclosure controls and content without instruction card framing', async () => {
  const p = 'src/pages/client/help/HelpArticleContent.vue';
  const template = descriptor(p).template.content;
  for (const open of [[], ['rules']]) {
    const html = await render(template, { articleThemeStyle: '--ui-bg:#15251d', article: { audience: 'boss', title: '规则', summary: '说明', sections: [{ id: 'rules', title: '退款规则', paragraphs: ['保留完整真实规则'] }] }, openSections: open, allOpen: !!open.length, toggleAll() {}, toggleSection() {} });
    assert.doesNotMatch(html, /点开标题查看说明/);
    assert.match(html, new RegExp(`aria-expanded="${!!open.length}"`));
    assert.equal(html.includes('保留完整真实规则'), !!open.length);
  }
  const styles = rule('src/pages/client/help/help.css', '.help-section');
  assert.equal(styles['border-radius'], '0');
  assert.equal(styles.background, 'transparent');
  assert.equal(rule('src/pages/client/help/help.css', '.help-section-toggle')['min-height'], '104rpx');
});

test('feedback list presents one clear empty state and compact primary action', async () => {
  const p = 'src/pages/client/complaints/index.vue';
  const html = await render(descriptor(p).template.content, { $appThemeStyle: '', uiIcons: { feedbackLight: '/feedback.png' }, loggedIn: true, loading: false, items: [], hasMore: false, error: '', create() {}, open() {}, load() {} });
  assert.match(html, /偷吃电竞/); assert.match(html, /提交反馈/); assert.match(html, /还没有反馈记录/); assert.match(html, /提交后，可在这里查看进度/);
  assert.doesNotMatch(html, /有问题随时告诉我们|遇到问题或有建议，告诉我们|进度与回复|empty-art|brand-dot/);
  const styles = rule(p, '.page button.feedback-action');
  assert.equal(styles['min-height'], '104rpx');
  assert.equal(styles['box-shadow'], 'none');
});

test('qualification and profile forms retain one policy explanation and neutral headers', async () => {
  const p = 'src/pages/player/escort-qualification/index.vue';
  const hero = await render(fragment(p, 'hero'));
  assert.match(hero, /护航资格申请/);
  assert.doesNotMatch(hero, /护航资格独立/);
  assert.equal(rule(p, '.hero').background, 'transparent');
  assert.equal(rule(p, '.hero').color, 'var(--ui-text, #172116)');
  assert.match(await render(fragment(p, 'card')), /不会改变原陪玩等级/);
  const q = 'src/pages/player/profile-settings/index.vue';
  assert.doesNotMatch(await render(fragment(q, 'hero-card')), /简介和语音修改提交审核/);
  assert.equal(rule(q, '.hero-card').background, 'transparent');
  assert.equal(rule(q, '.hero-card').color, 'var(--ui-text, #172116)');
  assert.match(await render(fragment(q, 'review-notice'), { settings: null }), /修改提交后进入审核，审核期间继续展示旧资料/);
});

test('application form uses section labels instead of numbered badges and notice icon', async () => {
  const p = 'src/pages/player/apply/index.vue';
  const heading = await render(fragment(p, 'form-head'));
  assert.match(heading, /申请信息/); assert.doesNotMatch(heading, /form-num/);
  const notice = await render(fragment(p, 'notice-banner'));
  assert.match(notice, /真实姓名仅供平台内部审核/); assert.doesNotMatch(notice, /notice-icon/);
  assert.equal(rule(p, '.form-card--notice').background, 'transparent');
});

test('home broadcasts keep live content without decorative geometry or fake live marker', async () => {
  const p = 'src/components/HomeAnnouncements.vue';
  const html = await render(descriptor(p).template.content, { cards: [{kind:'gift',title:'热门广播'}], feeds: {gift:{items:[],error:false,loading:false}}, active:true, open() {} });
  assert.match(html, /热门广播/); assert.match(html, /暂无通报/);
  assert.doesNotMatch(html, /announcement-live-dot/);
  assert.equal(rule(p, '.announcement-heading').position, 'static');
  assert.equal(rule(p, '.announcement-heading').background, 'transparent');
  assert.equal(rule(p, '.announcement-card').background, 'var(--ui-surface)');
  assert.equal(rule(p, '.announcement-card::after').content, undefined);
});

test('support actions remain visible under a neutral header and concise safety note', async () => {
  const p = 'src/pages/client/customer-service/index.vue';
  assert.match(await render(fragment(p, 'support-hero')), /联系客服/);
  const note = await render(fragment(p, 'support-tip'));
  assert.match(note, /返回微信首页搜索并添加客服/); assert.match(note, /不会主动索要支付密码或验证码/);
  assert.doesNotMatch(note, /<text>提示<\/text>/);
  assert.equal(rule(p, '.support-hero').background, 'transparent');
  assert.equal(rule(p, '.support-hero').color, 'var(--ui-text, #172116)');
  assert.equal(rule(p, '.support-tip').background, 'transparent');
});

test('completed activity retains results and reward notice without a second completion subtitle', async () => {
  const p = 'src/pages/client/national-bounty/index.vue';
  const html = await render(fragment(p, 'activity-heading'), { NATIONAL_BOUNTY_STATUS: '已结束', NATIONAL_BOUNTY_TITLE: '国庆冲榜收官' });
  assert.match(html, /国庆冲榜收官/); assert.match(html, /已结束/); assert.doesNotMatch(html, /圆满收官/);
});

test('player order list no longer nests order cards inside another card', async () => {
  const p = 'src/pages/player/my-orders/index.vue';
  function inspect(n, ancestors = []) {
    if (n.type === 1) {
      const classes = n.props.find(p => p.type === 6 && p.name === 'class')?.value?.content.split(' ') || [];
      if (classes.includes('order-card')) assert.ok(!ancestors.includes('club-card'), 'order cards should be direct list items, not card-in-card');
      for (const child of n.children || []) inspect(child, [...ancestors, ...classes]);
    } else for (const child of n.children || []) inspect(child, ancestors);
  }
  inspect(baseParse(descriptor(p).template.content));
  const html = await render(fragment(p, 'order-list'), { orders: [{ order_no:'SYNTHETIC-1', status:'待支付', boss_name:'测试', package_name:'测试服务', game_id:'', total_amount:'10', created_at:'' }], go() {}, statusClass:()=>'', orderDiamonds:()=>100, formatOrderTime:()=>'' });
  assert.match(html, /等待老板付款/); assert.match(html, /SYNTHETIC-1/); assert.match(html, /💎100/);
  assert.equal(rule(p, '.order-card').background, 'var(--ui-surface, #fff)');
});
