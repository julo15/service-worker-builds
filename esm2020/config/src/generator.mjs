/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { parseDurationToMs } from './duration';
import { globToRegex } from './glob';
const DEFAULT_NAVIGATION_URLS = [
    '/**',
    '!/**/*.*',
    '!/**/*__*',
    '!/**/*__*/**', // Exclude URLs containing `__` in any other segment.
];
/**
 * Consumes service worker configuration files and processes them into control files.
 *
 * @publicApi
 */
export class Generator {
    constructor(fs, baseHref) {
        this.fs = fs;
        this.baseHref = baseHref;
    }
    async process(config) {
        const unorderedHashTable = {};
        const assetGroups = await this.processAssetGroups(config, unorderedHashTable);
        return {
            configVersion: 1,
            timestamp: Date.now(),
            appData: config.appData,
            index: joinUrls(this.baseHref, config.index),
            assetGroups,
            dataGroups: this.processDataGroups(config),
            hashTable: withOrderedKeys(unorderedHashTable),
            navigationUrls: processNavigationUrls(this.baseHref, config.navigationUrls),
            navigationRequestStrategy: config.navigationRequestStrategy ?? 'performance',
        };
    }
    async processAssetGroups(config, hashTable) {
        // Retrieve all files of the build.
        const allFiles = await this.fs.list('/');
        const seenMap = new Set();
        const filesPerGroup = new Map();
        // Computed which files belong to each asset-group.
        for (const group of (config.assetGroups || [])) {
            if (group.resources.versionedFiles) {
                throw new Error(`Asset-group '${group.name}' in 'ngsw-config.json' uses the 'versionedFiles' option, ` +
                    'which is no longer supported. Use \'files\' instead.');
            }
            const fileMatcher = globListToMatcher(group.resources.files || []);
            const matchedFiles = allFiles.filter(fileMatcher).filter(file => !seenMap.has(file)).sort();
            matchedFiles.forEach(file => seenMap.add(file));
            filesPerGroup.set(group, matchedFiles);
        }
        // Compute hashes for all matched files and add them to the hash-table.
        const allMatchedFiles = [].concat(...Array.from(filesPerGroup.values())).sort();
        const allMatchedHashes = await processInBatches(allMatchedFiles, 500, file => this.fs.hash(file));
        allMatchedFiles.forEach((file, idx) => {
            hashTable[joinUrls(this.baseHref, file)] = allMatchedHashes[idx];
        });
        // Generate and return the processed asset-groups.
        return Array.from(filesPerGroup.entries())
            .map(([group, matchedFiles]) => ({
            name: group.name,
            installMode: group.installMode || 'prefetch',
            updateMode: group.updateMode || group.installMode || 'prefetch',
            cacheQueryOptions: buildCacheQueryOptions(group.cacheQueryOptions),
            urls: matchedFiles.map(url => joinUrls(this.baseHref, url)),
            patterns: (group.resources.urls || []).map(url => urlToRegex(url, this.baseHref, true)),
        }));
    }
    processDataGroups(config) {
        return (config.dataGroups || []).map(group => {
            return {
                name: group.name,
                patterns: group.urls.map(url => urlToRegex(url, this.baseHref, true)),
                strategy: group.cacheConfig.strategy || 'performance',
                maxSize: group.cacheConfig.maxSize,
                maxAge: parseDurationToMs(group.cacheConfig.maxAge),
                timeoutMs: group.cacheConfig.timeout && parseDurationToMs(group.cacheConfig.timeout),
                cacheOpaqueResponses: group.cacheConfig.cacheOpaqueResponses,
                cacheQueryOptions: buildCacheQueryOptions(group.cacheQueryOptions),
                version: group.version !== undefined ? group.version : 1,
            };
        });
    }
}
export function processNavigationUrls(baseHref, urls = DEFAULT_NAVIGATION_URLS) {
    return urls.map(url => {
        const positive = !url.startsWith('!');
        url = positive ? url : url.slice(1);
        return { positive, regex: `^${urlToRegex(url, baseHref)}$` };
    });
}
async function processInBatches(items, batchSize, processFn) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
        batches.push(items.slice(i, i + batchSize));
    }
    return batches.reduce(async (prev, batch) => (await prev).concat(await Promise.all(batch.map(item => processFn(item)))), Promise.resolve([]));
}
function globListToMatcher(globs) {
    const patterns = globs.map(pattern => {
        if (pattern.startsWith('!')) {
            return {
                positive: false,
                regex: new RegExp('^' + globToRegex(pattern.slice(1)) + '$'),
            };
        }
        else {
            return {
                positive: true,
                regex: new RegExp('^' + globToRegex(pattern) + '$'),
            };
        }
    });
    return (file) => matches(file, patterns);
}
function matches(file, patterns) {
    const res = patterns.reduce((isMatch, pattern) => {
        if (pattern.positive) {
            return isMatch || pattern.regex.test(file);
        }
        else {
            return isMatch && !pattern.regex.test(file);
        }
    }, false);
    return res;
}
function urlToRegex(url, baseHref, literalQuestionMark) {
    if (!url.startsWith('/') && url.indexOf('://') === -1) {
        // Prefix relative URLs with `baseHref`.
        // Strip a leading `.` from a relative `baseHref` (e.g. `./foo/`), since it would result in an
        // incorrect regex (matching a literal `.`).
        url = joinUrls(baseHref.replace(/^\.(?=\/)/, ''), url);
    }
    return globToRegex(url, literalQuestionMark);
}
function joinUrls(a, b) {
    if (a.endsWith('/') && b.startsWith('/')) {
        return a + b.slice(1);
    }
    else if (!a.endsWith('/') && !b.startsWith('/')) {
        return a + '/' + b;
    }
    return a + b;
}
function withOrderedKeys(unorderedObj) {
    const orderedObj = {};
    Object.keys(unorderedObj).sort().forEach(key => orderedObj[key] = unorderedObj[key]);
    return orderedObj;
}
function buildCacheQueryOptions(inOptions) {
    return {
        ignoreVary: true,
        ...inOptions,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvc2VydmljZS13b3JrZXIvY29uZmlnL3NyYy9nZW5lcmF0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLGlCQUFpQixFQUFDLE1BQU0sWUFBWSxDQUFDO0FBRTdDLE9BQU8sRUFBQyxXQUFXLEVBQUMsTUFBTSxRQUFRLENBQUM7QUFHbkMsTUFBTSx1QkFBdUIsR0FBRztJQUM5QixLQUFLO0lBQ0wsVUFBVTtJQUNWLFdBQVc7SUFDWCxjQUFjLEVBQUcscURBQXFEO0NBQ3ZFLENBQUM7QUFFRjs7OztHQUlHO0FBQ0gsTUFBTSxPQUFPLFNBQVM7SUFDcEIsWUFBcUIsRUFBYyxFQUFVLFFBQWdCO1FBQXhDLE9BQUUsR0FBRixFQUFFLENBQVk7UUFBVSxhQUFRLEdBQVIsUUFBUSxDQUFRO0lBQUcsQ0FBQztJQUVqRSxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQWM7UUFDMUIsTUFBTSxrQkFBa0IsR0FBRyxFQUFFLENBQUM7UUFDOUIsTUFBTSxXQUFXLEdBQUcsTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxFQUFFLGtCQUFrQixDQUFDLENBQUM7UUFFOUUsT0FBTztZQUNMLGFBQWEsRUFBRSxDQUFDO1lBQ2hCLFNBQVMsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFO1lBQ3JCLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTztZQUN2QixLQUFLLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQztZQUM1QyxXQUFXO1lBQ1gsVUFBVSxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUM7WUFDMUMsU0FBUyxFQUFFLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQztZQUM5QyxjQUFjLEVBQUUscUJBQXFCLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsY0FBYyxDQUFDO1lBQzNFLHlCQUF5QixFQUFFLE1BQU0sQ0FBQyx5QkFBeUIsSUFBSSxhQUFhO1NBQzdFLENBQUM7SUFDSixDQUFDO0lBRU8sS0FBSyxDQUFDLGtCQUFrQixDQUFDLE1BQWMsRUFBRSxTQUE2QztRQUU1RixtQ0FBbUM7UUFDbkMsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN6QyxNQUFNLE9BQU8sR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO1FBQ2xDLE1BQU0sYUFBYSxHQUFHLElBQUksR0FBRyxFQUF3QixDQUFDO1FBRXRELG1EQUFtRDtRQUNuRCxLQUFLLE1BQU0sS0FBSyxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsSUFBSSxFQUFFLENBQUMsRUFBRTtZQUM5QyxJQUFLLEtBQUssQ0FBQyxTQUFpQixDQUFDLGNBQWMsRUFBRTtnQkFDM0MsTUFBTSxJQUFJLEtBQUssQ0FDWCxnQkFBZ0IsS0FBSyxDQUFDLElBQUksNERBQTREO29CQUN0RixzREFBc0QsQ0FBQyxDQUFDO2FBQzdEO1lBRUQsTUFBTSxXQUFXLEdBQUcsaUJBQWlCLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDLENBQUM7WUFDbkUsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUU1RixZQUFZLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ2hELGFBQWEsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLFlBQVksQ0FBQyxDQUFDO1NBQ3hDO1FBRUQsdUVBQXVFO1FBQ3ZFLE1BQU0sZUFBZSxHQUFJLEVBQWUsQ0FBQyxNQUFNLENBQUMsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDOUYsTUFBTSxnQkFBZ0IsR0FDbEIsTUFBTSxnQkFBZ0IsQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUM3RSxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxFQUFFO1lBQ3BDLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ25FLENBQUMsQ0FBQyxDQUFDO1FBRUgsa0RBQWtEO1FBQ2xELE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLENBQUM7YUFDckMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsWUFBWSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDMUIsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJO1lBQ2hCLFdBQVcsRUFBRSxLQUFLLENBQUMsV0FBVyxJQUFJLFVBQVU7WUFDNUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxVQUFVLElBQUksS0FBSyxDQUFDLFdBQVcsSUFBSSxVQUFVO1lBQy9ELGlCQUFpQixFQUFFLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQztZQUNsRSxJQUFJLEVBQUUsWUFBWSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQzNELFFBQVEsRUFDSixDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQztTQUNsRixDQUFDLENBQUMsQ0FBQztJQUNmLENBQUM7SUFFTyxpQkFBaUIsQ0FBQyxNQUFjO1FBQ3RDLE9BQU8sQ0FBQyxNQUFNLENBQUMsVUFBVSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUMzQyxPQUFPO2dCQUNMLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSTtnQkFDaEIsUUFBUSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUNyRSxRQUFRLEVBQUUsS0FBSyxDQUFDLFdBQVcsQ0FBQyxRQUFRLElBQUksYUFBYTtnQkFDckQsT0FBTyxFQUFFLEtBQUssQ0FBQyxXQUFXLENBQUMsT0FBTztnQkFDbEMsTUFBTSxFQUFFLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDO2dCQUNuRCxTQUFTLEVBQUUsS0FBSyxDQUFDLFdBQVcsQ0FBQyxPQUFPLElBQUksaUJBQWlCLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUM7Z0JBQ3BGLG9CQUFvQixFQUFFLEtBQUssQ0FBQyxXQUFXLENBQUMsb0JBQW9CO2dCQUM1RCxpQkFBaUIsRUFBRSxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUM7Z0JBQ2xFLE9BQU8sRUFBRSxLQUFLLENBQUMsT0FBTyxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUN6RCxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUFFRCxNQUFNLFVBQVUscUJBQXFCLENBQ2pDLFFBQWdCLEVBQUUsSUFBSSxHQUFHLHVCQUF1QjtJQUNsRCxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDcEIsTUFBTSxRQUFRLEdBQUcsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3RDLEdBQUcsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwQyxPQUFPLEVBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxJQUFJLFVBQVUsQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLEdBQUcsRUFBQyxDQUFDO0lBQzdELENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQUVELEtBQUssVUFBVSxnQkFBZ0IsQ0FDM0IsS0FBVSxFQUFFLFNBQWlCLEVBQUUsU0FBc0M7SUFDdkUsTUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDO0lBRW5CLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxTQUFTLEVBQUU7UUFDaEQsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQztLQUM3QztJQUVELE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FDakIsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUNsQixDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUM5RSxPQUFPLENBQUMsT0FBTyxDQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDaEMsQ0FBQztBQUVELFNBQVMsaUJBQWlCLENBQUMsS0FBZTtJQUN4QyxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFO1FBQ25DLElBQUksT0FBTyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUMzQixPQUFPO2dCQUNMLFFBQVEsRUFBRSxLQUFLO2dCQUNmLEtBQUssRUFBRSxJQUFJLE1BQU0sQ0FBQyxHQUFHLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUM7YUFDN0QsQ0FBQztTQUNIO2FBQU07WUFDTCxPQUFPO2dCQUNMLFFBQVEsRUFBRSxJQUFJO2dCQUNkLEtBQUssRUFBRSxJQUFJLE1BQU0sQ0FBQyxHQUFHLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEdBQUcsQ0FBQzthQUNwRCxDQUFDO1NBQ0g7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUNILE9BQU8sQ0FBQyxJQUFZLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7QUFDbkQsQ0FBQztBQUVELFNBQVMsT0FBTyxDQUFDLElBQVksRUFBRSxRQUE4QztJQUMzRSxNQUFNLEdBQUcsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxFQUFFO1FBQy9DLElBQUksT0FBTyxDQUFDLFFBQVEsRUFBRTtZQUNwQixPQUFPLE9BQU8sSUFBSSxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUM1QzthQUFNO1lBQ0wsT0FBTyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUM3QztJQUNILENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNWLE9BQU8sR0FBRyxDQUFDO0FBQ2IsQ0FBQztBQUVELFNBQVMsVUFBVSxDQUFDLEdBQVcsRUFBRSxRQUFnQixFQUFFLG1CQUE2QjtJQUM5RSxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFO1FBQ3JELHdDQUF3QztRQUN4Qyw4RkFBOEY7UUFDOUYsNENBQTRDO1FBQzVDLEdBQUcsR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7S0FDeEQ7SUFFRCxPQUFPLFdBQVcsQ0FBQyxHQUFHLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztBQUMvQyxDQUFDO0FBRUQsU0FBUyxRQUFRLENBQUMsQ0FBUyxFQUFFLENBQVM7SUFDcEMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDeEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUN2QjtTQUFNLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRTtRQUNqRCxPQUFPLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0tBQ3BCO0lBQ0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ2YsQ0FBQztBQUVELFNBQVMsZUFBZSxDQUFpQyxZQUFlO0lBQ3RFLE1BQU0sVUFBVSxHQUFHLEVBQTBCLENBQUM7SUFDOUMsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDckYsT0FBTyxVQUFlLENBQUM7QUFDekIsQ0FBQztBQUVELFNBQVMsc0JBQXNCLENBQUMsU0FBbUQ7SUFFakYsT0FBTztRQUNMLFVBQVUsRUFBRSxJQUFJO1FBQ2hCLEdBQUcsU0FBUztLQUNiLENBQUM7QUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7cGFyc2VEdXJhdGlvblRvTXN9IGZyb20gJy4vZHVyYXRpb24nO1xuaW1wb3J0IHtGaWxlc3lzdGVtfSBmcm9tICcuL2ZpbGVzeXN0ZW0nO1xuaW1wb3J0IHtnbG9iVG9SZWdleH0gZnJvbSAnLi9nbG9iJztcbmltcG9ydCB7QXNzZXRHcm91cCwgQ29uZmlnfSBmcm9tICcuL2luJztcblxuY29uc3QgREVGQVVMVF9OQVZJR0FUSU9OX1VSTFMgPSBbXG4gICcvKionLCAgICAgICAgICAgLy8gSW5jbHVkZSBhbGwgVVJMcy5cbiAgJyEvKiovKi4qJywgICAgICAvLyBFeGNsdWRlIFVSTHMgdG8gZmlsZXMgKGNvbnRhaW5pbmcgYSBmaWxlIGV4dGVuc2lvbiBpbiB0aGUgbGFzdCBzZWdtZW50KS5cbiAgJyEvKiovKl9fKicsICAgICAvLyBFeGNsdWRlIFVSTHMgY29udGFpbmluZyBgX19gIGluIHRoZSBsYXN0IHNlZ21lbnQuXG4gICchLyoqLypfXyovKionLCAgLy8gRXhjbHVkZSBVUkxzIGNvbnRhaW5pbmcgYF9fYCBpbiBhbnkgb3RoZXIgc2VnbWVudC5cbl07XG5cbi8qKlxuICogQ29uc3VtZXMgc2VydmljZSB3b3JrZXIgY29uZmlndXJhdGlvbiBmaWxlcyBhbmQgcHJvY2Vzc2VzIHRoZW0gaW50byBjb250cm9sIGZpbGVzLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNsYXNzIEdlbmVyYXRvciB7XG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IGZzOiBGaWxlc3lzdGVtLCBwcml2YXRlIGJhc2VIcmVmOiBzdHJpbmcpIHt9XG5cbiAgYXN5bmMgcHJvY2Vzcyhjb25maWc6IENvbmZpZyk6IFByb21pc2U8T2JqZWN0PiB7XG4gICAgY29uc3QgdW5vcmRlcmVkSGFzaFRhYmxlID0ge307XG4gICAgY29uc3QgYXNzZXRHcm91cHMgPSBhd2FpdCB0aGlzLnByb2Nlc3NBc3NldEdyb3Vwcyhjb25maWcsIHVub3JkZXJlZEhhc2hUYWJsZSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgY29uZmlnVmVyc2lvbjogMSxcbiAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKSxcbiAgICAgIGFwcERhdGE6IGNvbmZpZy5hcHBEYXRhLFxuICAgICAgaW5kZXg6IGpvaW5VcmxzKHRoaXMuYmFzZUhyZWYsIGNvbmZpZy5pbmRleCksXG4gICAgICBhc3NldEdyb3VwcyxcbiAgICAgIGRhdGFHcm91cHM6IHRoaXMucHJvY2Vzc0RhdGFHcm91cHMoY29uZmlnKSxcbiAgICAgIGhhc2hUYWJsZTogd2l0aE9yZGVyZWRLZXlzKHVub3JkZXJlZEhhc2hUYWJsZSksXG4gICAgICBuYXZpZ2F0aW9uVXJsczogcHJvY2Vzc05hdmlnYXRpb25VcmxzKHRoaXMuYmFzZUhyZWYsIGNvbmZpZy5uYXZpZ2F0aW9uVXJscyksXG4gICAgICBuYXZpZ2F0aW9uUmVxdWVzdFN0cmF0ZWd5OiBjb25maWcubmF2aWdhdGlvblJlcXVlc3RTdHJhdGVneSA/PyAncGVyZm9ybWFuY2UnLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHByb2Nlc3NBc3NldEdyb3Vwcyhjb25maWc6IENvbmZpZywgaGFzaFRhYmxlOiB7W2ZpbGU6IHN0cmluZ106IHN0cmluZ3x1bmRlZmluZWR9KTpcbiAgICAgIFByb21pc2U8T2JqZWN0W10+IHtcbiAgICAvLyBSZXRyaWV2ZSBhbGwgZmlsZXMgb2YgdGhlIGJ1aWxkLlxuICAgIGNvbnN0IGFsbEZpbGVzID0gYXdhaXQgdGhpcy5mcy5saXN0KCcvJyk7XG4gICAgY29uc3Qgc2Vlbk1hcCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIGNvbnN0IGZpbGVzUGVyR3JvdXAgPSBuZXcgTWFwPEFzc2V0R3JvdXAsIHN0cmluZ1tdPigpO1xuXG4gICAgLy8gQ29tcHV0ZWQgd2hpY2ggZmlsZXMgYmVsb25nIHRvIGVhY2ggYXNzZXQtZ3JvdXAuXG4gICAgZm9yIChjb25zdCBncm91cCBvZiAoY29uZmlnLmFzc2V0R3JvdXBzIHx8IFtdKSkge1xuICAgICAgaWYgKChncm91cC5yZXNvdXJjZXMgYXMgYW55KS52ZXJzaW9uZWRGaWxlcykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICBgQXNzZXQtZ3JvdXAgJyR7Z3JvdXAubmFtZX0nIGluICduZ3N3LWNvbmZpZy5qc29uJyB1c2VzIHRoZSAndmVyc2lvbmVkRmlsZXMnIG9wdGlvbiwgYCArXG4gICAgICAgICAgICAnd2hpY2ggaXMgbm8gbG9uZ2VyIHN1cHBvcnRlZC4gVXNlIFxcJ2ZpbGVzXFwnIGluc3RlYWQuJyk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGZpbGVNYXRjaGVyID0gZ2xvYkxpc3RUb01hdGNoZXIoZ3JvdXAucmVzb3VyY2VzLmZpbGVzIHx8IFtdKTtcbiAgICAgIGNvbnN0IG1hdGNoZWRGaWxlcyA9IGFsbEZpbGVzLmZpbHRlcihmaWxlTWF0Y2hlcikuZmlsdGVyKGZpbGUgPT4gIXNlZW5NYXAuaGFzKGZpbGUpKS5zb3J0KCk7XG5cbiAgICAgIG1hdGNoZWRGaWxlcy5mb3JFYWNoKGZpbGUgPT4gc2Vlbk1hcC5hZGQoZmlsZSkpO1xuICAgICAgZmlsZXNQZXJHcm91cC5zZXQoZ3JvdXAsIG1hdGNoZWRGaWxlcyk7XG4gICAgfVxuXG4gICAgLy8gQ29tcHV0ZSBoYXNoZXMgZm9yIGFsbCBtYXRjaGVkIGZpbGVzIGFuZCBhZGQgdGhlbSB0byB0aGUgaGFzaC10YWJsZS5cbiAgICBjb25zdCBhbGxNYXRjaGVkRmlsZXMgPSAoW10gYXMgc3RyaW5nW10pLmNvbmNhdCguLi5BcnJheS5mcm9tKGZpbGVzUGVyR3JvdXAudmFsdWVzKCkpKS5zb3J0KCk7XG4gICAgY29uc3QgYWxsTWF0Y2hlZEhhc2hlcyA9XG4gICAgICAgIGF3YWl0IHByb2Nlc3NJbkJhdGNoZXMoYWxsTWF0Y2hlZEZpbGVzLCA1MDAsIGZpbGUgPT4gdGhpcy5mcy5oYXNoKGZpbGUpKTtcbiAgICBhbGxNYXRjaGVkRmlsZXMuZm9yRWFjaCgoZmlsZSwgaWR4KSA9PiB7XG4gICAgICBoYXNoVGFibGVbam9pblVybHModGhpcy5iYXNlSHJlZiwgZmlsZSldID0gYWxsTWF0Y2hlZEhhc2hlc1tpZHhdO1xuICAgIH0pO1xuXG4gICAgLy8gR2VuZXJhdGUgYW5kIHJldHVybiB0aGUgcHJvY2Vzc2VkIGFzc2V0LWdyb3Vwcy5cbiAgICByZXR1cm4gQXJyYXkuZnJvbShmaWxlc1Blckdyb3VwLmVudHJpZXMoKSlcbiAgICAgICAgLm1hcCgoW2dyb3VwLCBtYXRjaGVkRmlsZXNdKSA9PiAoe1xuICAgICAgICAgICAgICAgbmFtZTogZ3JvdXAubmFtZSxcbiAgICAgICAgICAgICAgIGluc3RhbGxNb2RlOiBncm91cC5pbnN0YWxsTW9kZSB8fCAncHJlZmV0Y2gnLFxuICAgICAgICAgICAgICAgdXBkYXRlTW9kZTogZ3JvdXAudXBkYXRlTW9kZSB8fCBncm91cC5pbnN0YWxsTW9kZSB8fCAncHJlZmV0Y2gnLFxuICAgICAgICAgICAgICAgY2FjaGVRdWVyeU9wdGlvbnM6IGJ1aWxkQ2FjaGVRdWVyeU9wdGlvbnMoZ3JvdXAuY2FjaGVRdWVyeU9wdGlvbnMpLFxuICAgICAgICAgICAgICAgdXJsczogbWF0Y2hlZEZpbGVzLm1hcCh1cmwgPT4gam9pblVybHModGhpcy5iYXNlSHJlZiwgdXJsKSksXG4gICAgICAgICAgICAgICBwYXR0ZXJuczpcbiAgICAgICAgICAgICAgICAgICAoZ3JvdXAucmVzb3VyY2VzLnVybHMgfHwgW10pLm1hcCh1cmwgPT4gdXJsVG9SZWdleCh1cmwsIHRoaXMuYmFzZUhyZWYsIHRydWUpKSxcbiAgICAgICAgICAgICB9KSk7XG4gIH1cblxuICBwcml2YXRlIHByb2Nlc3NEYXRhR3JvdXBzKGNvbmZpZzogQ29uZmlnKTogT2JqZWN0W10ge1xuICAgIHJldHVybiAoY29uZmlnLmRhdGFHcm91cHMgfHwgW10pLm1hcChncm91cCA9PiB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBuYW1lOiBncm91cC5uYW1lLFxuICAgICAgICBwYXR0ZXJuczogZ3JvdXAudXJscy5tYXAodXJsID0+IHVybFRvUmVnZXgodXJsLCB0aGlzLmJhc2VIcmVmLCB0cnVlKSksXG4gICAgICAgIHN0cmF0ZWd5OiBncm91cC5jYWNoZUNvbmZpZy5zdHJhdGVneSB8fCAncGVyZm9ybWFuY2UnLFxuICAgICAgICBtYXhTaXplOiBncm91cC5jYWNoZUNvbmZpZy5tYXhTaXplLFxuICAgICAgICBtYXhBZ2U6IHBhcnNlRHVyYXRpb25Ub01zKGdyb3VwLmNhY2hlQ29uZmlnLm1heEFnZSksXG4gICAgICAgIHRpbWVvdXRNczogZ3JvdXAuY2FjaGVDb25maWcudGltZW91dCAmJiBwYXJzZUR1cmF0aW9uVG9Ncyhncm91cC5jYWNoZUNvbmZpZy50aW1lb3V0KSxcbiAgICAgICAgY2FjaGVPcGFxdWVSZXNwb25zZXM6IGdyb3VwLmNhY2hlQ29uZmlnLmNhY2hlT3BhcXVlUmVzcG9uc2VzLFxuICAgICAgICBjYWNoZVF1ZXJ5T3B0aW9uczogYnVpbGRDYWNoZVF1ZXJ5T3B0aW9ucyhncm91cC5jYWNoZVF1ZXJ5T3B0aW9ucyksXG4gICAgICAgIHZlcnNpb246IGdyb3VwLnZlcnNpb24gIT09IHVuZGVmaW5lZCA/IGdyb3VwLnZlcnNpb24gOiAxLFxuICAgICAgfTtcbiAgICB9KTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcHJvY2Vzc05hdmlnYXRpb25VcmxzKFxuICAgIGJhc2VIcmVmOiBzdHJpbmcsIHVybHMgPSBERUZBVUxUX05BVklHQVRJT05fVVJMUyk6IHtwb3NpdGl2ZTogYm9vbGVhbiwgcmVnZXg6IHN0cmluZ31bXSB7XG4gIHJldHVybiB1cmxzLm1hcCh1cmwgPT4ge1xuICAgIGNvbnN0IHBvc2l0aXZlID0gIXVybC5zdGFydHNXaXRoKCchJyk7XG4gICAgdXJsID0gcG9zaXRpdmUgPyB1cmwgOiB1cmwuc2xpY2UoMSk7XG4gICAgcmV0dXJuIHtwb3NpdGl2ZSwgcmVnZXg6IGBeJHt1cmxUb1JlZ2V4KHVybCwgYmFzZUhyZWYpfSRgfTtcbiAgfSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHByb2Nlc3NJbkJhdGNoZXM8SSwgTz4oXG4gICAgaXRlbXM6IElbXSwgYmF0Y2hTaXplOiBudW1iZXIsIHByb2Nlc3NGbjogKGl0ZW06IEkpID0+IE8gfCBQcm9taXNlPE8+KTogUHJvbWlzZTxPW10+IHtcbiAgY29uc3QgYmF0Y2hlcyA9IFtdO1xuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgaXRlbXMubGVuZ3RoOyBpICs9IGJhdGNoU2l6ZSkge1xuICAgIGJhdGNoZXMucHVzaChpdGVtcy5zbGljZShpLCBpICsgYmF0Y2hTaXplKSk7XG4gIH1cblxuICByZXR1cm4gYmF0Y2hlcy5yZWR1Y2UoXG4gICAgICBhc3luYyAocHJldiwgYmF0Y2gpID0+XG4gICAgICAgICAgKGF3YWl0IHByZXYpLmNvbmNhdChhd2FpdCBQcm9taXNlLmFsbChiYXRjaC5tYXAoaXRlbSA9PiBwcm9jZXNzRm4oaXRlbSkpKSksXG4gICAgICBQcm9taXNlLnJlc29sdmU8T1tdPihbXSkpO1xufVxuXG5mdW5jdGlvbiBnbG9iTGlzdFRvTWF0Y2hlcihnbG9iczogc3RyaW5nW10pOiAoZmlsZTogc3RyaW5nKSA9PiBib29sZWFuIHtcbiAgY29uc3QgcGF0dGVybnMgPSBnbG9icy5tYXAocGF0dGVybiA9PiB7XG4gICAgaWYgKHBhdHRlcm4uc3RhcnRzV2l0aCgnIScpKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBwb3NpdGl2ZTogZmFsc2UsXG4gICAgICAgIHJlZ2V4OiBuZXcgUmVnRXhwKCdeJyArIGdsb2JUb1JlZ2V4KHBhdHRlcm4uc2xpY2UoMSkpICsgJyQnKSxcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHBvc2l0aXZlOiB0cnVlLFxuICAgICAgICByZWdleDogbmV3IFJlZ0V4cCgnXicgKyBnbG9iVG9SZWdleChwYXR0ZXJuKSArICckJyksXG4gICAgICB9O1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiAoZmlsZTogc3RyaW5nKSA9PiBtYXRjaGVzKGZpbGUsIHBhdHRlcm5zKTtcbn1cblxuZnVuY3Rpb24gbWF0Y2hlcyhmaWxlOiBzdHJpbmcsIHBhdHRlcm5zOiB7cG9zaXRpdmU6IGJvb2xlYW4sIHJlZ2V4OiBSZWdFeHB9W10pOiBib29sZWFuIHtcbiAgY29uc3QgcmVzID0gcGF0dGVybnMucmVkdWNlKChpc01hdGNoLCBwYXR0ZXJuKSA9PiB7XG4gICAgaWYgKHBhdHRlcm4ucG9zaXRpdmUpIHtcbiAgICAgIHJldHVybiBpc01hdGNoIHx8IHBhdHRlcm4ucmVnZXgudGVzdChmaWxlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGlzTWF0Y2ggJiYgIXBhdHRlcm4ucmVnZXgudGVzdChmaWxlKTtcbiAgICB9XG4gIH0sIGZhbHNlKTtcbiAgcmV0dXJuIHJlcztcbn1cblxuZnVuY3Rpb24gdXJsVG9SZWdleCh1cmw6IHN0cmluZywgYmFzZUhyZWY6IHN0cmluZywgbGl0ZXJhbFF1ZXN0aW9uTWFyaz86IGJvb2xlYW4pOiBzdHJpbmcge1xuICBpZiAoIXVybC5zdGFydHNXaXRoKCcvJykgJiYgdXJsLmluZGV4T2YoJzovLycpID09PSAtMSkge1xuICAgIC8vIFByZWZpeCByZWxhdGl2ZSBVUkxzIHdpdGggYGJhc2VIcmVmYC5cbiAgICAvLyBTdHJpcCBhIGxlYWRpbmcgYC5gIGZyb20gYSByZWxhdGl2ZSBgYmFzZUhyZWZgIChlLmcuIGAuL2Zvby9gKSwgc2luY2UgaXQgd291bGQgcmVzdWx0IGluIGFuXG4gICAgLy8gaW5jb3JyZWN0IHJlZ2V4IChtYXRjaGluZyBhIGxpdGVyYWwgYC5gKS5cbiAgICB1cmwgPSBqb2luVXJscyhiYXNlSHJlZi5yZXBsYWNlKC9eXFwuKD89XFwvKS8sICcnKSwgdXJsKTtcbiAgfVxuXG4gIHJldHVybiBnbG9iVG9SZWdleCh1cmwsIGxpdGVyYWxRdWVzdGlvbk1hcmspO1xufVxuXG5mdW5jdGlvbiBqb2luVXJscyhhOiBzdHJpbmcsIGI6IHN0cmluZyk6IHN0cmluZyB7XG4gIGlmIChhLmVuZHNXaXRoKCcvJykgJiYgYi5zdGFydHNXaXRoKCcvJykpIHtcbiAgICByZXR1cm4gYSArIGIuc2xpY2UoMSk7XG4gIH0gZWxzZSBpZiAoIWEuZW5kc1dpdGgoJy8nKSAmJiAhYi5zdGFydHNXaXRoKCcvJykpIHtcbiAgICByZXR1cm4gYSArICcvJyArIGI7XG4gIH1cbiAgcmV0dXJuIGEgKyBiO1xufVxuXG5mdW5jdGlvbiB3aXRoT3JkZXJlZEtleXM8VCBleHRlbmRzIHtba2V5OiBzdHJpbmddOiBhbnl9Pih1bm9yZGVyZWRPYmo6IFQpOiBUIHtcbiAgY29uc3Qgb3JkZXJlZE9iaiA9IHt9IGFzIHtba2V5OiBzdHJpbmddOiBhbnl9O1xuICBPYmplY3Qua2V5cyh1bm9yZGVyZWRPYmopLnNvcnQoKS5mb3JFYWNoKGtleSA9PiBvcmRlcmVkT2JqW2tleV0gPSB1bm9yZGVyZWRPYmpba2V5XSk7XG4gIHJldHVybiBvcmRlcmVkT2JqIGFzIFQ7XG59XG5cbmZ1bmN0aW9uIGJ1aWxkQ2FjaGVRdWVyeU9wdGlvbnMoaW5PcHRpb25zPzogUGljazxDYWNoZVF1ZXJ5T3B0aW9ucywgJ2lnbm9yZVNlYXJjaCc+KTpcbiAgICBDYWNoZVF1ZXJ5T3B0aW9ucyB7XG4gIHJldHVybiB7XG4gICAgaWdub3JlVmFyeTogdHJ1ZSxcbiAgICAuLi5pbk9wdGlvbnMsXG4gIH07XG59XG4iXX0=