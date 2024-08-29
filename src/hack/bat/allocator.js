export default class Allocator {
	/** @param {number[]} availableAllocs */
	constructor(availableAllocs) {
		this.availableAllocs = availableAllocs.slice();
		this.availableAscRank = availableAllocs.map((val, ind)=>ind);
		this._rerank();
	}

	_rerank() {
		this.availableAscRank = this.availableAllocs.map((val, ind)=>ind)
			.sort((indA, indB) => this.availableAllocs[indA] - this.availableAllocs[indB]);
	}

	/** 
	 * @param {number} count
	 * @param {boolean} splitable
	 * @return allocation result
	 */
	alloc(count, splitable=true) {
		const availableAllocTmp = this.availableAllocs.slice();
		const allocation = this.availableAllocs.map(()=>0);

		if (splitable) {
			for (let i=0; i<this.availableAscRank.length; ++i) {
				const curAlloc = Math.min(this.availableAllocs[this.availableAscRank[i]], count);
				availableAllocTmp[this.availableAscRank[i]] -= curAlloc;
				allocation[this.availableAscRank[i]] += curAlloc;
				count -= curAlloc;
				if (count === 0) {
					break;
				}
			}
		} else {
			for (let i=0; i<this.availableAscRank.length; ++i) {
				if (this.availableAllocs[this.availableAscRank[i]] >= count) {
					availableAllocTmp[this.availableAscRank[i]] -= count;
					allocation[this.availableAscRank[i]] += count;
					count = 0;
					break;
				}
			}
		}

		if (count === 0) {
			this.availableAllocs = availableAllocTmp;
			this._rerank();
			return {success:true, allocation:allocation};
		} else {
			return {success:false, allocation:this.availableAllocs.map(()=>0)};
		}
	}

	/** 
	 * @param {number[]} allocation
	 */
	free(allocation) {
		for (let i=0; i<allocation.length; ++i) {
			this.availableAllocs[i]+=allocation[i];
		}
		this._rerank();
	}
}