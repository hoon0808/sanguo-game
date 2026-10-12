// 시나리오: 시작 연도별 세력 배치
// 역사를 바탕으로 하되 게임 편의를 위해 일부 시점·소속을 조정함
var SG = SG || {};
SG.SCENARIOS = [
  {
    id: 's190', name: '반동탁연합', year: 190, month: 1,
    desc: '동탁이 황제를 끼고 낙양에서 권력을 휘두르자, 원소를 맹주로 한 관동의 제후들이 군사를 일으킨다. 천하가 갈라지는 시작.',
    forces: [
      { lord: 'dongzhuo', color: 'purple', cities: {
        luoyang: ['dongzhuo', 'lvbu', 'huaxiong', 'liru', 'xurong', 'wangyun', 'diaochan', 'caiyong', 'zhangliao', 'gaoshun'],
        changan: ['lijue', 'guosi', 'fanchou', 'zhangji', 'zhangxiu', 'jiaxu', 'huangfusong', 'dongcheng', 'yangfeng', 'duanwei']
      } },
      { lord: 'yuanshao', color: 'yellow', cities: {
        nanpi: ['yuanshao', 'yuantan', 'yanliang', 'wenchou', 'fengji', 'xuyou', 'guotu', 'chunyuqiong', 'quyi', 'gaogan', 'chenlin']
      } },
      { lord: 'hanfu', color: 'lime', cities: {
        ye: ['hanfu', 'jushou', 'tianfeng', 'zhanghe', 'shenpei', 'xinpi', 'gaolan']
      } },
      { lord: 'caocao', color: 'blue', cities: {
        chenliu: ['caocao', 'xiahoudun', 'xiahouyuan', 'caoren', 'caohong', 'caochun', 'yuejin', 'lidian', 'baoxin', 'caoang']
      } },
      { lord: 'yuanshu', color: 'orange', cities: {
        wan: ['yuanshu', 'jiling', 'zhangxun', 'qiaorui', 'leibo', 'yanxiang'],
        runan: ['liuxun', 'chenlan']
      } },
      { lord: 'sunjian', color: 'red', cities: {
        changsha: ['sunjian', 'sunce', 'chengpu', 'huanggai', 'hantang', 'wujing', 'sunben', 'sunjing', 'lvfan']
      } },
      { lord: 'liubiao', color: 'teal', cities: {
        xiangyang: ['liubiao', 'caimao', 'kuaiyue', 'kuailiang', 'zhangyun', 'wenpin', 'liuqi'],
        jiangxia: ['huangzu']
      } },
      { lord: 'gongsunzan', color: 'cyan', cities: {
        beiping: ['gongsunzan', 'gongsunxu', 'zhaoyun', 'tiankai', 'guanjing']
      } },
      { lord: 'liuyu', color: 'maroon', cities: {
        ji: ['liuyu', 'xianyufu', 'yanrou', 'tianyu']
      } },
      { lord: 'liubei', color: 'green', cities: {
        pingyuan: ['liubei', 'guanyu', 'zhangfei', 'jianyong']
      } },
      { lord: 'liuyan', color: 'brown', cities: {
        chengdu: ['liuyan', 'liuzhang', 'zhangren', 'wuyi', 'zhangsong'],
        hanzhong: ['zhanglu', 'zhangwei', 'yangren'],
        jiangzhou: ['yanyan'],
        zitong: ['huangquan']
      } },
      { lord: 'mateng', color: 'olive', cities: {
        wuwei: ['mateng', 'pangde'],
        tianshui: ['hansui', 'chenggongying', 'yanxing', 'yangqiu']
      } },
      { lord: 'taoqian', color: 'navy', cities: {
        xiapi: ['taoqian', 'mizhu', 'mifang', 'caobao', 'chendeng', 'chengui', 'zangba', 'sunqian']
      } },
      { lord: 'gongsundu', color: 'slate', cities: {
        xiangping: ['gongsundu', 'gongsunkang', 'liuyi', 'beiyan']
      } },
      { lord: 'kongrong', color: 'pink', cities: {
        beihai: ['kongrong', 'wuanguo', 'taishici']
      } },
      { lord: 'liuyao', color: 'violet', cities: {
        jianye: ['liuyao', 'zhangying']
      } },
      { lord: 'wanglang', color: 'gray', cities: {
        kuaiji: ['wanglang', 'yufan', 'heqi']
      } },
      { lord: 'yanbaihu', color: 'sand', cities: {
        wu: ['yanbaihu', 'yanyu']
      } }
    ],
    free: {}
  },
  {
    id: 's194', name: '군웅할거', year: 194, month: 1,
    desc: '동탁이 죽은 뒤 장안은 이각·곽사의 손에 넘어가고, 각지의 군웅이 저마다 땅을 넓히려 다툰다. 도겸에게서 서주를 물려받은 유비, 연주를 노리는 여포가 등장한다.',
    forces: [
      { lord: 'caocao', color: 'blue', cities: {
        chenliu: ['caocao', 'xiahoudun', 'xunyu', 'chengyu', 'dianwei', 'xuchu', 'caoang', 'maojie', 'manchong', 'lidian'],
        qiao: ['xiahouyuan', 'caoren', 'caohong', 'caochun', 'yuejin', 'yujin']
      } },
      { lord: 'lvbu', color: 'purple', cities: {
        puyang: ['lvbu', 'gaoshun', 'chengong', 'zhangliao', 'zhangmiao', 'songxian', 'weixu', 'diaochan']
      } },
      { lord: 'liubei', color: 'green', cities: {
        xiapi: ['liubei', 'guanyu', 'mizhu', 'mifang', 'sunqian', 'jianyong', 'chendeng', 'chengui', 'caobao', 'zangba'],
        xiaopei: ['zhangfei', 'chendao']
      } },
      { lord: 'yuanshao', color: 'yellow', cities: {
        ye: ['yuanshao', 'tianfeng', 'jushou', 'shenpei', 'guotu', 'fengji', 'xuyou', 'yanliang', 'wenchou', 'zhanghe', 'chunyuqiong', 'xinpi', 'chenlin'],
        nanpi: ['yuanxi', 'gaolan', 'quyi'],
        pingyuan: ['yuantan', 'yuanshang'],
        jinyang: ['gaogan']
      } },
      { lord: 'yuanshu', color: 'orange', cities: {
        shouchun: ['yuanshu', 'jiling', 'zhangxun', 'qiaorui', 'leibo', 'yanxiang'],
        runan: ['liuxun', 'chenlan']
      } },
      { lord: 'sunce', color: 'red', cities: {
        lujiang: ['sunce', 'zhouyu', 'chengpu', 'huanggai', 'hantang', 'zhoutai', 'jiangqin', 'chenwu', 'lvfan', 'sunben', 'sunjing', 'wujing', 'lvmeng']
      } },
      { lord: 'lijue', color: 'maroon', cities: {
        changan: ['lijue', 'fanchou', 'liru', 'duanwei'],
        luoyang: ['guosi', 'yangfeng', 'xuhuang', 'dongcheng']
      } },
      { lord: 'liubiao', color: 'teal', cities: {
        xiangyang: ['liubiao', 'caimao', 'kuaiyue', 'kuailiang', 'zhangyun', 'wenpin', 'liuqi', 'yiji'],
        jiangxia: ['huangzu'],
        changsha: ['liupan', 'huangzhong', 'hanxuan']
      } },
      { lord: 'liuzhang', color: 'brown', cities: {
        chengdu: ['liuzhang', 'zhangren', 'zhangsong', 'fazheng', 'mengda', 'lengbao'],
        jiangzhou: ['yanyan', 'leitong'],
        zitong: ['huangquan', 'wuyi', 'wulan']
      } },
      { lord: 'zhanglu', color: 'olive', cities: {
        hanzhong: ['zhanglu', 'zhangwei', 'yanpu', 'yangren']
      } },
      { lord: 'mateng', color: 'lime', cities: {
        wuwei: ['mateng', 'machao', 'maxiu', 'madai', 'pangde'],
        tianshui: ['hansui', 'chenggongying', 'yanxing', 'yangqiu']
      } },
      { lord: 'gongsunzan', color: 'cyan', cities: {
        ji: ['gongsunzan', 'gongsunxu', 'guanjing', 'zhaoyun', 'tianyu'],
        beiping: ['tiankai']
      } },
      { lord: 'gongsundu', color: 'slate', cities: {
        xiangping: ['gongsundu', 'gongsunkang', 'liuyi', 'beiyan']
      } },
      { lord: 'liuyao', color: 'violet', cities: {
        jianye: ['liuyao', 'taishici', 'zhangying']
      } },
      { lord: 'wanglang', color: 'gray', cities: {
        kuaiji: ['wanglang', 'yufan', 'heqi']
      } },
      { lord: 'yanbaihu', color: 'sand', cities: {
        wu: ['yanbaihu', 'yanyu']
      } },
      { lord: 'zhangxiu', color: 'pink', cities: {
        wan: ['zhangxiu', 'zhangji', 'hucheer', 'jiaxu']
      } },
      { lord: 'kongrong', color: 'navy', cities: {
        beihai: ['kongrong', 'wuanguo']
      } }
    ],
    free: {}
  },
  {
    id: 's200', name: '관도대전', year: 200, month: 1,
    desc: '황제를 허창에 맞아들인 조조와 하북 4주를 차지한 원소가 관도에서 맞붙는다. 강동에서는 손책이, 여남에서는 유비가 기회를 엿본다.',
    forces: [
      { lord: 'caocao', color: 'blue', cities: {
        xuchang: ['caocao', 'xunyu', 'xunyou', 'guojia', 'jiaxu', 'liuye', 'chenqun', 'maojie', 'xuchu', 'kongrong', 'huaxin', 'caozhen'],
        chenliu: ['xiahoudun', 'caohong', 'yuejin', 'lidian', 'xuhuang', 'zhangliao'],
        puyang: ['chengyu', 'yujin', 'manchong'],
        qiao: ['caoren', 'caochun', 'caoxiu'],
        xiaopei: ['xiahouyuan'],
        xiapi: ['chendeng', 'chengui'],
        beihai: ['zangba'],
        luoyang: ['duanwei'],
        changan: ['zhongyao'],
        wan: ['zhangxiu', 'hucheer'],
        shouchun: ['liuxun', 'jiangji']
      } },
      { lord: 'yuanshao', color: 'yellow', cities: {
        ye: ['yuanshao', 'yuanshang', 'tianfeng', 'jushou', 'shenpei', 'fengji', 'guotu', 'xuyou', 'yanliang', 'wenchou', 'zhanghe', 'gaolan', 'chunyuqiong', 'chenlin'],
        nanpi: ['xinpi'],
        pingyuan: ['yuantan'],
        ji: ['yuanxi', 'xianyufu'],
        beiping: ['yanrou'],
        jinyang: ['gaogan']
      } },
      { lord: 'sunce', color: 'red', cities: {
        wu: ['sunce', 'sunquan', 'sunjing', 'wujing', 'zhangzhao', 'zhanghong', 'guyong', 'lvfan', 'lingcao'],
        kuaiji: ['yufan', 'heqi', 'dongxi'],
        jianye: ['chengpu', 'jiangqin', 'chenwu', 'lvmeng', 'xusheng'],
        lujiang: ['zhoutai', 'sunyu'],
        chaisang: ['zhouyu', 'huanggai', 'hantang', 'taishici', 'sunben', 'lusu']
      } },
      { lord: 'liubiao', color: 'teal', cities: {
        xiangyang: ['liubiao', 'liuqi', 'caimao', 'zhangyun', 'kuaiyue', 'wenpin', 'yiji'],
        jiangling: ['kuailiang'],
        jiangxia: ['huangzu', 'ganning'],
        changsha: ['liupan', 'huangzhong', 'hanxuan', 'weiyan'],
        wuling: ['jinxuan', 'gongzhi'],
        lingling: ['liudu', 'liuxian', 'xingdaorong'],
        guiyang: ['zhaofan', 'chenying']
      } },
      { lord: 'liuzhang', color: 'brown', cities: {
        chengdu: ['liuzhang', 'zhangren', 'zhangsong', 'fazheng', 'mengda', 'wuyi', 'wulan'],
        zitong: ['huangquan', 'lengbao'],
        jiangzhou: ['yanyan', 'wuban'],
        yongan: ['leitong']
      } },
      { lord: 'zhanglu', color: 'olive', cities: {
        hanzhong: ['zhanglu', 'zhangwei', 'yanpu'],
        wudu: ['yangren']
      } },
      { lord: 'mateng', color: 'lime', cities: {
        wuwei: ['mateng', 'machao', 'madai', 'pangde'],
        tianshui: ['maxiu', 'matie']
      } },
      { lord: 'hansui', color: 'sand', cities: {
        anding: ['hansui', 'chenggongying', 'yanxing', 'yangqiu']
      } },
      { lord: 'gongsundu', color: 'slate', cities: {
        xiangping: ['gongsundu', 'gongsunkang', 'gongsungong', 'liuyi', 'beiyan']
      } },
      { lord: 'liubei', color: 'green', cities: {
        runan: ['liubei', 'guanyu', 'zhangfei', 'zhaoyun', 'sunqian', 'jianyong', 'mizhu', 'mifang', 'chendao', 'zhoucang']
      } }
    ],
    free: {}
  },
  {
    id: 's208', name: '적벽대전', year: 208, month: 7,
    desc: '하북을 평정한 조조가 대군을 이끌고 남하해 형주를 손에 넣는다. 강하로 몰린 유비는 제갈량을 보내 손권과 손을 잡으려 한다.',
    forces: [
      { lord: 'caocao', color: 'blue', cities: {
        ye: ['caocao', 'caopi', 'caozhi', 'xuchu', 'xunyou', 'chengyu', 'jiaxu', 'liuye', 'simayi', 'maojie', 'chenlin'],
        ji: ['tianyu', 'xianyufu'],
        beiping: ['yanrou'],
        nanpi: ['caozhang'],
        pingyuan: ['gaolan'],
        beihai: ['zangba'],
        jinyang: ['guohuai', 'haozhao'],
        puyang: ['xinpi'],
        chenliu: ['huaxin'],
        xiaopei: ['lidian'],
        xiapi: ['chendeng'],
        xuchang: ['xunyu', 'chenqun'],
        qiao: ['caoxiu'],
        runan: ['manchong'],
        luoyang: ['xiahoushang', 'wangshuang'],
        changan: ['zhongyao', 'duanwei', 'xiahouyuan'],
        shouchun: ['zhangliao', 'yuejin', 'jiangji', 'liuxun'],
        wan: ['caohong'],
        xinye: ['yujin'],
        xiangyang: ['liucong', 'kuaiyue', 'xushu', 'wenpin', 'caochun', 'liuba'],
        jiangling: ['caoren', 'xuhuang', 'zhanghe', 'caimao', 'zhangyun', 'xiahoudun', 'caozhen', 'hucheer']
      } },
      { lord: 'sunquan', color: 'red', cities: {
        wu: ['sunquan', 'zhangzhao', 'zhanghong', 'guyong', 'zhugejin', 'buzhi', 'kanze', 'sunshangxiang', 'lvfan'],
        chaisang: ['zhouyu', 'lusu', 'chengpu', 'huanggai', 'hantang', 'ganning', 'lingtong', 'lvmeng', 'zhoutai', 'jiangqin', 'chenwu', 'dongxi', 'xusheng', 'panzhang'],
        jianye: ['sunyu', 'sunben', 'zhuran', 'sunshao'],
        kuaiji: ['yufan', 'heqi', 'luxun', 'zhuhuan'],
        lujiang: ['sunjing']
      } },
      { lord: 'liubei', color: 'green', cities: {
        jiangxia: ['liubei', 'guanyu', 'zhangfei', 'zhaoyun', 'zhugeliang', 'mizhu', 'mifang', 'sunqian', 'jianyong', 'yiji', 'liuqi', 'chendao', 'liufeng', 'guanping', 'zhoucang', 'huangyueying']
      } },
      { lord: 'liuzhang', color: 'brown', cities: {
        chengdu: ['liuzhang', 'zhangren', 'zhangsong', 'fazheng', 'mengda', 'wuyi', 'liyan', 'wulan'],
        zitong: ['huangquan', 'lengbao'],
        jiangzhou: ['yanyan', 'wuban'],
        yongan: ['leitong']
      } },
      { lord: 'zhanglu', color: 'olive', cities: {
        hanzhong: ['zhanglu', 'zhangwei', 'yanpu'],
        wudu: ['yangren']
      } },
      { lord: 'mateng', color: 'lime', cities: {
        wuwei: ['mateng', 'machao', 'madai', 'pangde'],
        tianshui: ['maxiu', 'matie']
      } },
      { lord: 'hansui', color: 'sand', cities: {
        anding: ['hansui', 'chenggongying', 'yanxing', 'yangqiu']
      } },
      { lord: 'gongsunkang', color: 'slate', cities: {
        xiangping: ['gongsunkang', 'gongsungong', 'gongsunyuan', 'beiyan']
      } },
      { lord: 'hanxuan', color: 'maroon', cities: {
        changsha: ['hanxuan', 'huangzhong', 'weiyan', 'liupan']
      } },
      { lord: 'jinxuan', color: 'pink', cities: {
        wuling: ['jinxuan', 'gongzhi']
      } },
      { lord: 'liudu', color: 'violet', cities: {
        lingling: ['liudu', 'liuxian', 'xingdaorong']
      } },
      { lord: 'zhaofan', color: 'gray', cities: {
        guiyang: ['zhaofan', 'chenying']
      } }
    ],
    free: {}
  },
  {
    id: 's221', name: '삼국정립', year: 221, month: 7,
    desc: '조비가 한나라의 제위를 물려받아 위를 세우고, 유비는 성도에서 촉한의 황제에 오른다. 관우를 잃은 유비가 오를 치려 하는 가운데 세 나라가 천하를 나눈다.',
    forces: [
      { lord: 'caopi', color: 'blue', cities: {
        luoyang: ['caopi', 'caorui', 'simayi', 'chenqun', 'huaxin', 'wanglang', 'jiaxu', 'liuye', 'xinpi', 'xuchu', 'caoshuang'],
        xuchang: ['zhongyao', 'xushu'],
        ye: ['caozhang'],
        ji: ['tianyu', 'xianyufu'],
        beiping: ['yanrou'],
        nanpi: ['wangji'],
        pingyuan: ['guanqiujian'],
        beihai: ['caozhi'],
        jinyang: ['haozhao'],
        puyang: ['chentai'],
        chenliu: ['dengai'],
        xiaopei: ['xiahouba'],
        xiapi: ['zangba', 'zhugedan'],
        qiao: ['caoxiu', 'wenqin'],
        runan: ['liucong'],
        shouchun: ['zhangliao', 'manchong', 'jiangji'],
        wan: ['xiahoushang'],
        xinye: ['xuhuang'],
        xiangyang: ['caoren', 'wenpin'],
        shangyong: ['mengda'],
        changan: ['caozhen', 'zhanghe', 'guohuai', 'caohong'],
        anding: ['yangqiu'],
        tianshui: ['jiangwei', 'wangshuang'],
        wuwei: ['yanxing', 'chenggongying']
      } },
      { lord: 'liubei', color: 'green', cities: {
        chengdu: ['liubei', 'zhugeliang', 'liuba', 'yiji', 'dongyun', 'jiangwan', 'feiyi', 'yangyi', 'huangyueying'],
        yongan: ['huangquan', 'maliang', 'guanxing', 'zhangbao', 'wuban', 'chendao', 'masu'],
        jiangzhou: ['zhaoyun', 'mazhong', 'zhangni'],
        zitong: ['liyan', 'yanyan', 'zhangyi', 'liaohua'],
        hanzhong: ['weiyan', 'wangping', 'wuyi'],
        wudu: ['machao', 'madai']
      } },
      { lord: 'sunquan', color: 'red', cities: {
        jianye: ['sunquan', 'zhangzhao', 'guyong', 'kanze', 'zhugeke', 'sunshangxiang'],
        wu: ['zhuhuan'],
        kuaiji: ['yufan', 'heqi'],
        lujiang: ['lvfan'],
        chaisang: ['zhoutai', 'dingfeng'],
        jiangxia: ['zhugejin', 'quancong'],
        jiangling: ['luxun', 'zhuran', 'hantang', 'panzhang', 'xusheng'],
        changsha: ['buzhi'],
        wuling: ['ganning'],
        lingling: ['mifang'],
        guiyang: ['sunshao']
      } },
      { lord: 'menghuo', color: 'orange', cities: {
        yunnan: ['menghuo', 'zhurong', 'mengyou', 'dailai', 'wutugu', 'duosi', 'mulu', 'jinhuan', 'dongtuna'],
        jianning: ['yongkai', 'gaoding']
      } },
      { lord: 'gongsungong', color: 'slate', cities: {
        xiangping: ['gongsungong', 'gongsunyuan', 'beiyan']
      } }
    ],
    free: {}
  },
  {
    id: 's184', name: '황건적의 난', year: 184, month: 2,
    desc: '장각이 "창천이 죽고 황천이 서리라"를 외치며 봉기하자 각지의 황건적이 한꺼번에 들고일어난다. 대장군 하진은 노식·황보숭·주준을 보내 진압에 나서고, 조조·유비·손견 같은 젊은 영웅들도 의병을 모은다.',
    forces: [
      { lord: 'zhangjiao', color: 'yellow', cities: {
        ye: ['zhangjiao', 'zhangbao2', 'zhangliang'],
        nanpi: ['chengyuanzhi', 'dengmao'],
        wan: ['zhangmancheng'],
        runan: ['bocai'],
        beihai: ['guanhai', 'peiyuanshao']
      } },
      { lord: 'hejin', color: 'purple', cities: {
        luoyang: ['hejin', 'luzhi', 'yuanshao', 'yuanshu', 'wangyun', 'caiyong', 'chenlin', 'chunyuqiong', 'baoxin', 'kongrong', 'xuyou', 'fengji'],
        xuchang: ['huangfusong', 'zhujun', 'xunyu', 'xunyou', 'zhongyao', 'guotu', 'chenqun'],
        changan: ['dongcheng', 'huaxin']
      } },
      { lord: 'caocao', color: 'blue', cities: {
        qiao: ['caocao', 'xiahoudun', 'xiahouyuan', 'caoren', 'caohong']
      } },
      { lord: 'liubei', color: 'green', cities: {
        ji: ['liubei', 'guanyu', 'zhangfei', 'jianyong']
      } },
      { lord: 'sunjian', color: 'red', cities: {
        wu: ['sunjian', 'chengpu', 'huanggai', 'hantang', 'wujing', 'sunjing']
      } },
      { lord: 'dongzhuo', color: 'maroon', cities: {
        anding: ['dongzhuo', 'liru', 'lijue', 'guosi', 'huaxiong', 'xurong', 'jiaxu'],
        tianshui: ['fanchou', 'zhangji', 'duanwei', 'zhangxiu']
      } },
      { lord: 'hansui', color: 'olive', cities: {
        wuwei: ['hansui', 'mateng', 'yangqiu']
      } },
      { lord: 'dingyuan', color: 'slate', cities: {
        jinyang: ['dingyuan', 'lvbu', 'zhangyang', 'zhangliao', 'gaoshun', 'songxian', 'weixu']
      } },
      { lord: 'gongsunzan', color: 'cyan', cities: {
        beiping: ['gongsunzan', 'tiankai', 'guanjing']
      } },
      { lord: 'liuyan', color: 'brown', cities: {
        chengdu: ['liuyan', 'liuzhang', 'zhangren'],
        jiangzhou: ['yanyan']
      } },
      { lord: 'liubiao', color: 'teal', cities: {
        xiangyang: ['liubiao', 'caimao', 'kuaiyue', 'kuailiang', 'zhangyun'],
        jiangxia: ['huangzu']
      } },
      { lord: 'gongsundu', color: 'gray', cities: {
        xiangping: ['gongsundu', 'liuyi', 'beiyan']
      } },
      { lord: 'taoqian', color: 'navy', cities: {
        xiapi: ['taoqian', 'caobao', 'chengui', 'mizhu', 'zangba']
      } }
    ],
    free: {}
  },
  {
    id: 's219', name: '관우의 북벌', year: 219, month: 7,
    desc: '한중을 차지하고 한중왕에 오른 유비의 명으로 관우가 형주에서 북상해 번성의 조인을 에워싼다. 천하가 관우의 이름에 떠는 사이, 손권은 여몽을 보내 형주의 뒤를 노린다.',
    forces: [
      { lord: 'caocao', color: 'blue', cities: {
        ye: ['caocao', 'caopi', 'caozhi', 'xuchu', 'jiaxu', 'chengyu', 'huaxin', 'liuye', 'simayi', 'chenqun', 'wanglang', 'xinpi'],
        luoyang: ['xiahoudun', 'caorui'],
        xuchang: ['zhongyao', 'xushu'],
        ji: ['tianyu', 'xianyufu'],
        beiping: ['yanrou'],
        nanpi: ['wangji'],
        pingyuan: ['guanqiujian'],
        beihai: ['liucong'],
        jinyang: ['haozhao'],
        puyang: ['chentai'],
        chenliu: ['dengai'],
        xiaopei: ['caoshuang'],
        xiapi: ['zangba', 'zhugedan'],
        qiao: ['caoxiu', 'xiahouba'],
        runan: ['wenqin'],
        shouchun: ['zhangliao', 'jiangji'],
        changan: ['caozhen', 'zhanghe', 'guohuai', 'caohong', 'caozhang'],
        anding: ['yangqiu'],
        tianshui: ['jiangwei'],
        wuwei: ['yanxing', 'chenggongying'],
        wudu: ['wangshuang'],
        wan: ['xuhuang', 'xiahoushang'],
        xinye: ['wenpin'],
        xiangyang: ['caoren', 'manchong', 'yujin', 'pangde']
      } },
      { lord: 'liubei', color: 'green', cities: {
        chengdu: ['liubei', 'zhugeliang', 'mizhu', 'liuba', 'yiji', 'maliang', 'dongyun', 'jiangwan', 'feiyi', 'yangyi', 'huangyueying'],
        hanzhong: ['weiyan', 'huangzhong', 'fazheng', 'zhaoyun', 'wangping', 'chendao'],
        zitong: ['zhangfei', 'machao', 'madai', 'zhangbao'],
        jiangzhou: ['yanyan', 'liyan', 'huangquan', 'zhangyi'],
        yongan: ['wuyi', 'wuban'],
        jianning: ['mazhong', 'zhangni'],
        shangyong: ['liufeng', 'mengda'],
        jiangling: ['guanyu', 'guanping', 'guanxing', 'zhoucang', 'liaohua', 'mifang'],
        wuling: ['gongzhi', 'masu'],
        lingling: ['liuxian']
      } },
      { lord: 'sunquan', color: 'red', cities: {
        jianye: ['sunquan', 'zhangzhao', 'guyong', 'kanze', 'zhugeke', 'sunshangxiang', 'sunshao', 'xusheng'],
        wu: ['zhuhuan', 'xiaoqiao'],
        kuaiji: ['heqi', 'quancong'],
        lujiang: ['zhoutai'],
        chaisang: ['hantang', 'lvfan', 'dingfeng'],
        jiangxia: ['lvmeng', 'luxun', 'zhuran', 'panzhang', 'yufan', 'zhugejin'],
        changsha: ['ganning'],
        guiyang: ['buzhi']
      } },
      { lord: 'menghuo', color: 'pink', cities: {
        yunnan: ['menghuo', 'zhurong', 'mengyou', 'dailai', 'wutugu', 'duosi', 'mulu', 'jinhuan', 'dongtuna']
      } },
      { lord: 'gongsunkang', color: 'gray', cities: {
        xiangping: ['gongsunkang', 'gongsungong', 'gongsunyuan', 'beiyan']
      } }
    ],
    free: {}
  },
  {
    id: 's225', name: '남만 정벌', year: 225, month: 3,
    desc: '유비가 세상을 떠난 뒤 제갈량은 오와 다시 손을 잡고, 남중에서 일어난 반란을 다스리러 직접 군사를 이끈다. 남만왕 맹획은 축융 부인과 여러 동주들을 모아 맞선다.',
    forces: [
      { lord: 'caopi', color: 'blue', cities: {
        luoyang: ['caopi', 'caorui', 'simayi', 'simashi', 'chenqun', 'huaxin', 'wanglang', 'liuye', 'xinpi', 'xuchu', 'caoshuang'],
        xuchang: ['zhongyao', 'xushu'],
        ye: ['caozhi'],
        ji: ['tianyu', 'xianyufu'],
        beiping: ['yanrou'],
        nanpi: ['wangji'],
        pingyuan: ['guanqiujian'],
        beihai: ['liucong'],
        jinyang: ['haozhao'],
        puyang: ['chentai'],
        chenliu: ['dengai'],
        xiaopei: ['xiahouba'],
        xiapi: ['zangba', 'zhugedan'],
        qiao: ['wenqin'],
        runan: ['huangquan'],
        shouchun: ['caoxiu', 'manchong', 'jiangji'],
        wan: ['xuhuang'],
        xinye: ['caohong'],
        xiangyang: ['wenpin'],
        shangyong: ['mengda'],
        changan: ['caozhen', 'zhanghe', 'guohuai', 'wangshuang'],
        anding: ['yangqiu'],
        tianshui: ['jiangwei'],
        wuwei: ['yanxing', 'chenggongying']
      } },
      { lord: 'sunquan', color: 'red', cities: {
        jianye: ['sunquan', 'zhangzhao', 'guyong', 'kanze', 'zhugeke', 'sunshangxiang', 'sundeng'],
        wu: ['zhuhuan'],
        kuaiji: ['heqi', 'yufan'],
        lujiang: ['lvfan'],
        chaisang: ['hantang', 'dingfeng'],
        jiangxia: ['zhugejin', 'quancong'],
        jiangling: ['luxun', 'zhuran'],
        wuling: ['panzhang'],
        changsha: ['buzhi'],
        lingling: ['mifang'],
        guiyang: ['sunshao']
      } },
      { lord: 'liushan', color: 'green', cities: {
        chengdu: ['liushan', 'zhugeliang', 'jiangwan', 'feiyi', 'dongyun', 'yangyi', 'huangyueying', 'qiaozhou', 'masu', 'wangping', 'guanxing', 'zhangbao'],
        jiangzhou: ['mazhong', 'zhangni', 'zhangyi'],
        yongan: ['liyan', 'chendao', 'wuban'],
        zitong: ['zhaoyun', 'liaohua'],
        hanzhong: ['weiyan', 'wuyi'],
        wudu: ['madai']
      } },
      { lord: 'menghuo', color: 'sand', cities: {
        yunnan: ['menghuo', 'zhurong', 'mengyou', 'dailai', 'wutugu', 'duosi', 'mulu', 'jinhuan', 'dongtuna'],
        jianning: ['yongkai', 'gaoding']
      } },
      { lord: 'gongsungong', color: 'gray', cities: {
        xiangping: ['gongsungong', 'gongsunyuan', 'beiyan']
      } }
    ],
    free: {}
  },
  {
    id: 'hero', name: '영웅집결 (가상)', year: 200, month: 1, heroes: true, noEvents: true,
    desc: '시대를 넘어 모든 영웅이 한창 나이로 한자리에 모인다. 동탁과 손견, 사마의와 강유가 같은 하늘 아래에서 천하를 다투는 가상 시나리오.',
    forces: [
      { lord: 'caocao', color: 'blue', cities: {
        xuchang: ['caocao', 'xiahoudun', 'xiahouyuan', 'dianwei', 'xuchu', 'guojia', 'xunyu', 'xunyou', 'chengyu', 'caoren', 'caohong', 'caopi', 'liuye', 'manchong'],
        chenliu: ['xuhuang', 'yujin', 'yuejin', 'lidian', 'caochun', 'caozhang', 'caoxiu', 'caozhen', 'maojie', 'chenqun']
      } },
      { lord: 'liubei', color: 'green', cities: {
        xiapi: ['liubei', 'guanyu', 'zhangfei', 'zhaoyun', 'zhugeliang', 'pangtong', 'xushu', 'fazheng', 'mizhu', 'sunqian', 'jianyong', 'huangyueying', 'maliang', 'masu'],
        xiaopei: ['huangzhong', 'weiyan', 'chendao', 'zhoucang', 'guanping', 'guanxing', 'zhangbao', 'liufeng']
      } },
      { lord: 'sunce', color: 'red', cities: {
        jianye: ['sunce', 'zhouyu', 'taishici', 'zhangzhao', 'zhanghong', 'dongxi', 'lingcao', 'lvfan', 'daqiao', 'xiaoqiao'],
        lujiang: ['zhoutai', 'jiangqin', 'chenwu']
      } },
      { lord: 'sunquan', color: 'pink', cities: {
        wu: ['sunquan', 'lusu', 'luxun', 'lvmeng', 'ganning', 'lingtong', 'zhugejin', 'guyong', 'sunshangxiang', 'buzhi', 'kanze', 'lukang'],
        kuaiji: ['zhuran', 'zhuhuan', 'xusheng', 'dingfeng', 'panzhang', 'quancong', 'heqi', 'yufan']
      } },
      { lord: 'sunjian', color: 'violet', cities: {
        changsha: ['sunjian', 'chengpu', 'huanggai', 'hantang', 'wujing', 'sunjing', 'sunben']
      } },
      { lord: 'lvbu', color: 'purple', cities: {
        puyang: ['lvbu', 'chengong', 'zhangliao', 'gaoshun', 'diaochan', 'songxian', 'weixu', 'zhangmiao', 'zhangyang']
      } },
      { lord: 'dongzhuo', color: 'maroon', cities: {
        luoyang: ['dongzhuo', 'huaxiong', 'liru', 'lijue', 'guosi', 'xurong', 'fanchou', 'zhangji', 'jiaxu', 'zhangxiu', 'hucheer', 'duanwei']
      } },
      { lord: 'yuanshao', color: 'yellow', cities: {
        ye: ['yuanshao', 'tianfeng', 'jushou', 'shenpei', 'yanliang', 'wenchou', 'zhanghe', 'gaolan', 'guotu', 'fengji', 'xuyou', 'chenlin'],
        nanpi: ['yuantan', 'yuanxi', 'yuanshang', 'quyi', 'gaogan', 'chunyuqiong']
      } },
      { lord: 'yuanshu', color: 'orange', cities: {
        shouchun: ['yuanshu', 'jiling', 'zhangxun', 'qiaorui', 'leibo', 'yanxiang'],
        runan: ['chenlan', 'liuxun']
      } },
      { lord: 'mateng', color: 'olive', cities: {
        wuwei: ['mateng', 'machao', 'madai', 'pangde', 'maxiu', 'matie', 'hansui'],
        anding: ['chenggongying', 'yanxing', 'yangqiu']
      } },
      { lord: 'liubiao', color: 'teal', cities: {
        xiangyang: ['liubiao', 'caimao', 'kuaiyue', 'kuailiang', 'zhangyun', 'wenpin', 'liuqi', 'yiji', 'liuba'],
        jiangxia: ['huangzu', 'liupan']
      } },
      { lord: 'liuzhang', color: 'brown', cities: {
        chengdu: ['liuzhang', 'zhangren', 'zhangsong', 'huangquan', 'liyan', 'wuyi', 'mengda', 'lengbao', 'leitong', 'wulan'],
        jiangzhou: ['yanyan', 'wuban']
      } },
      { lord: 'zhanglu', color: 'lime', cities: {
        hanzhong: ['zhanglu', 'zhangwei', 'yanpu', 'yangren']
      } },
      { lord: 'gongsunzan', color: 'cyan', cities: {
        beiping: ['gongsunzan', 'gongsunxu', 'tiankai', 'guanjing'],
        ji: ['tianyu', 'yanrou', 'xianyufu']
      } },
      { lord: 'menghuo', color: 'sand', cities: {
        yunnan: ['menghuo', 'zhurong', 'mengyou', 'dailai', 'wutugu', 'duosi', 'mulu', 'jinhuan', 'dongtuna'],
        jianning: ['yongkai', 'gaoding']
      } },
      { lord: 'simayi', color: 'navy', cities: {
        changan: ['simayi', 'simashi', 'simazhao', 'dengai', 'zhonghui', 'guohuai', 'chentai', 'haozhao', 'wangshuang', 'zhugedan']
      } },
      { lord: 'jiangwei', color: 'slate', cities: {
        tianshui: ['jiangwei', 'xiahouba', 'wangping', 'zhangyi', 'liaohua', 'feiyi', 'zhugezhan'],
        wudu: ['zhangni', 'mazhong']
      } }
    ],
    free: {}
  }
];
