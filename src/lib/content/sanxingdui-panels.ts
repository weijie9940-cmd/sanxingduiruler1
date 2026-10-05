/**
 * 首页「展陈」四个面板的文案。
 * 只改这个文件即可调整内容；组件见 src/components/exhibit-panels.tsx。
 *
 * 核对来源（2026-10 查证）：
 * - 遗址发现与发掘经过：中央纪委国家监委网站 v.ccdi.gov.cn/2021/04/10/VIDEiM0cdTrVDoBdk9WgV5ut210410.shtml
 * - 祭祀坑年代与出土数量：中国新闻网 chinanews.com/m/cul/2022/06-13/9778609.shtml
 * - 青铜大立人尺寸与工艺：四川省文物局 wwj.sc.gov.cn/scwwj/sdai/2020/3/2/0ad1521d24334651b737289b8b3a0c65.shtml
 * - 金杖、神树：人民日报海外版 paper.people.com.cn/rmrbhwb/html/2018-07/31/content_1871451.htm
 * - 神树与十日传说解读：中国新闻网 chinanews.com.cn/gn/2024/07-23/10255975.shtml
 * - 纵目面具尺寸：国家民委 neac.gov.cn/seac/c103391/202306/1165481.shtml
 * - 纵目与蚕丛的争论：四川大学报 newspaper.scu.edu.cn/info/2119/5003.htm
 */

export type PanelId = "discovery" | "bronze-gold" | "motifs" | "ruler";

export interface PanelPoint {
  label: string;
  text: string;
}

export interface ExhibitPanel {
  id: PanelId;
  /** 序号，显示在按钮与面板里 */
  index: string;
  /** 导航按钮上的中文名 */
  nav: string;
  /** 导航按钮上的英文小字 */
  en: string;
  /** 面板标题 */
  title: string;
  paragraphs: string[];
  points?: PanelPoint[];
}

export const PANEL_DISCLAIMER = "内容为文化科普性介绍，具体以博物馆及考古报告为准。";

export const EXHIBIT_PANELS: readonly ExhibitPanel[] = [
  {
    id: "discovery",
    index: "01",
    nav: "遗址与发现",
    en: "DISCOVERY",
    title: "沉睡数千年的古蜀都邑",
    paragraphs: [
      "三星堆遗址位于四川省广汉市。1929年，当地农民在月亮湾一带发现一批玉石器，这处遗址由此进入学界的视野。",
      "1986年，砖厂取土时相继发现一、二号祭祀坑，青铜面具、青铜神树、金杖等重器同出，古蜀文明第一次以如此完整的面貌呈现在世人面前。",
      "2019年起，考古人员又在祭祀区发现三至八号祭祀坑，并自2020年起陆续发掘，工作至今仍在继续。据早年研究，遗址的使用延续了近两千年。",
    ],
    points: [
      { label: "1929", text: "月亮湾发现玉石器" },
      { label: "1986", text: "一、二号祭祀坑发掘" },
      { label: "2019 起", text: "发现并发掘三至八号祭祀坑" },
      { label: "年代", text: "三、四、七、八号坑据碳十四测年属商代晚期，距今约三千二百至三千年" },
    ],
  },
  {
    id: "bronze-gold",
    index: "02",
    nav: "青铜与黄金",
    en: "BRONZE & GOLD",
    title: "铜铸神像，金作威仪",
    paragraphs: [
      "三星堆出土的青铜器以人像、面具、神树为代表，造型奇崛，风格独树一帜。青铜大立人通高二百六十点八厘米，其中人像高一百八十厘米，由分段浇铸嵌合而成，身体中空。",
      "一号青铜神树通高三点九六米，分三层，每层三枝，枝上立鸟，是目前所见体量最大的青铜文物之一。",
      "黄金多以金皮、金箔的形式出现。一号坑出土的金杖长一点四二米，是以约五百克的金皮包卷在木杖上制成的。",
    ],
    points: [
      { label: "青铜大立人", text: "通高 260.8 厘米，分段浇铸" },
      { label: "青铜纵目面具", text: "宽 138 厘米，高 66 厘米" },
      { label: "金杖", text: "长 142 厘米，金皮包卷木杖" },
      { label: "小铜人像", text: "三号坑所出，经 X 射线与 CT 检测，采用芯骨铸造工艺" },
    ],
  },
  {
    id: "motifs",
    index: "03",
    nav: "纹样与寓意",
    en: "MOTIFS",
    title: "目、树、日与鸟",
    paragraphs: [
      "以下多为学界的解读与推测，并无定论。",
      "纵目：《华阳国志》记蜀侯蚕丛“其目纵”，不少学者将其与柱状凸目的青铜面具相联系，视为祖先神或神灵的形象；也有学者认为二者不宜直接等同。",
      "神树与太阳：神树分层生枝、枝上立鸟，常被联系到扶桑、若木与“十日”传说；太阳形器以放射状芒纹表现光明，一般认为与太阳崇拜有关。",
      "鸟与鱼：金杖一端的图案中有人头、鸟与鱼的图案，有学者推测与部族结盟有关，也有学者认为是穗形物，反映稻作。",
    ],
    points: [
      { label: "纵目", text: "祖先神或神灵形象（推测）" },
      { label: "神树", text: "联系扶桑、若木与十日传说（推测）" },
      { label: "太阳形器", text: "一般认为象征太阳崇拜" },
      { label: "金杖纹样", text: "说法不一，尚无定论" },
    ],
  },
  {
    id: "ruler",
    index: "04",
    nav: "尺的设计",
    en: "THE RULER",
    title: "一尺之间，取意三星堆",
    paragraphs: [
      "这枚书签尺是以三星堆为灵感的文创设计，属于“取意”与“致敬”，并非任何文物的复制品或仿制品。",
      "尺长一百五十毫米，铜金镂空，双面纹样：一面施珐琅，一面为镂金，纹样取三星堆的金与青铜意象再创作。",
      "尺尾垂青绿丝绦，这一色调可令人联想到青铜器出土时的青绿锈色；末端缀红玉珠与琥珀椭圆坠饰，既添一抹暖色，也呼应三星堆出土的玉戈、玉璋等玉器。",
    ],
    points: [
      { label: "尺长", text: "一百五十毫米" },
      { label: "尺身", text: "铜金镂空，双面纹样" },
      { label: "双面", text: "一面珐琅，一面镂金" },
      { label: "流苏", text: "青绿丝绦，红玉与琥珀坠" },
    ],
  },
];
