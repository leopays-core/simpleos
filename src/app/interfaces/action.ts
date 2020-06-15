export interface Action {
    id: number,
    seq: number,
    type: string,
    action_name: string,
    contract: string,
    user: string,
    block: number,
    date: string,
    amount: number,
    symbol: symbol,
    memo: string,
    votedProducers: any,
    proxy: string,
    voter: string,
    matched: boolean,
    json_data: any,
}
