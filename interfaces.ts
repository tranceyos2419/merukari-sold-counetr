export interface CSVInput {
  Keyword: string;
  Identity: string;
  OMURL: string;
  SP: number;
  NMURL: string;
  MSC: number;
}
export interface CSVOutput extends CSVInput {
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
  status: string;
  updated: string;
}
