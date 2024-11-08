export interface ProxyInput {
  proxyURL: string,
  username: string,
  password: string,
}
export interface CSVInput {
  Keyword: string;
  Identity: string;
  OMURL: string;
  OYURL: string;
  ECURL: string;
  SP: number;
  FMP: string;
  TSC: number;
}
export interface CSVOutput extends CSVInput {
  MC: number;
  MMP: number;
  NMURL: string;
  MSC: number;
  name: string;
  switchAll: string;
  kws: string;
  kwes: string;
  pmin: number;
  pmax: number;
  sve: void;
  nickname: void;
  nicknameExs: void;
  itemStatuses: string;
  freeShipping: void;
  kwsTitle: string;
  kwesTitle: string;
  autoBuy: string;
  gotoBuy: string;
  type: string;
  target: void;
  category: void;
  size: void;
  brand: void;
  sellerId: void;
  sellerIdExs: void;
  notificationCnt: number;
  receiveCnt: number;
  openCnt: number;
  buyCnt: void;
  buyPrice: void;
  autoBuyTryCnt: number;
  autoBuySuccessCnt: number;
  autoMoveTryCnt: number;
  autoMoveSuccessCnt: number;
  tags: string;
  memo: string;

}

// Interface for scraped item data
export interface ScrapedItem {
  id: string;
  name: string;
  price: string;
  status: string;
  updated: string;
}

export interface ScrapedCondition {
  keyword: string;
  excludeKeyword: string;
  priceMin: string;
  priceMax: string;
}
