/**
 * @fileoverview added by tsickle
 * Generated from: packages/service-worker/src/update.ts
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Injectable } from '@angular/core';
import { NEVER } from 'rxjs';
import { ERR_SW_NOT_SUPPORTED, NgswCommChannel } from './low_level';
/**
 * Subscribe to update notifications from the Service Worker, trigger update
 * checks, and forcibly activate updates.
 *
 * \@publicApi
 */
let SwUpdate = /** @class */ (() => {
    /**
     * Subscribe to update notifications from the Service Worker, trigger update
     * checks, and forcibly activate updates.
     *
     * \@publicApi
     */
    class SwUpdate {
        /**
         * @param {?} sw
         */
        constructor(sw) {
            this.sw = sw;
            if (!sw.isEnabled) {
                this.available = NEVER;
                this.activated = NEVER;
                return;
            }
            this.available = this.sw.eventsOfType('UPDATE_AVAILABLE');
            this.activated = this.sw.eventsOfType('UPDATE_ACTIVATED');
        }
        /**
         * True if the Service Worker is enabled (supported by the browser and enabled via
         * `ServiceWorkerModule`).
         * @return {?}
         */
        get isEnabled() {
            return this.sw.isEnabled;
        }
        /**
         * @return {?}
         */
        checkForUpdate() {
            if (!this.sw.isEnabled) {
                return Promise.reject(new Error(ERR_SW_NOT_SUPPORTED));
            }
            /** @type {?} */
            const statusNonce = this.sw.generateNonce();
            return this.sw.postMessageWithStatus('CHECK_FOR_UPDATES', { statusNonce }, statusNonce);
        }
        /**
         * @return {?}
         */
        activateUpdate() {
            if (!this.sw.isEnabled) {
                return Promise.reject(new Error(ERR_SW_NOT_SUPPORTED));
            }
            /** @type {?} */
            const statusNonce = this.sw.generateNonce();
            return this.sw.postMessageWithStatus('ACTIVATE_UPDATE', { statusNonce }, statusNonce);
        }
    }
    SwUpdate.decorators = [
        { type: Injectable }
    ];
    /** @nocollapse */
    SwUpdate.ctorParameters = () => [
        { type: NgswCommChannel }
    ];
    return SwUpdate;
})();
export { SwUpdate };
if (false) {
    /**
     * Emits an `UpdateAvailableEvent` event whenever a new app version is available.
     * @type {?}
     */
    SwUpdate.prototype.available;
    /**
     * Emits an `UpdateActivatedEvent` event whenever the app has been updated to a new version.
     * @type {?}
     */
    SwUpdate.prototype.activated;
    /**
     * @type {?}
     * @private
     */
    SwUpdate.prototype.sw;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvc2VydmljZS13b3JrZXIvc3JjL3VwZGF0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFRQSxPQUFPLEVBQUMsVUFBVSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQ3pDLE9BQU8sRUFBQyxLQUFLLEVBQWEsTUFBTSxNQUFNLENBQUM7QUFFdkMsT0FBTyxFQUFDLG9CQUFvQixFQUFFLGVBQWUsRUFBNkMsTUFBTSxhQUFhLENBQUM7Ozs7Ozs7QUFVOUc7Ozs7Ozs7SUFBQSxNQUNhLFFBQVE7Ozs7UUFtQm5CLFlBQW9CLEVBQW1CO1lBQW5CLE9BQUUsR0FBRixFQUFFLENBQWlCO1lBQ3JDLElBQUksQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFO2dCQUNqQixJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztnQkFDdkIsSUFBSSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7Z0JBQ3ZCLE9BQU87YUFDUjtZQUNELElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQXVCLGtCQUFrQixDQUFDLENBQUM7WUFDaEYsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBdUIsa0JBQWtCLENBQUMsQ0FBQztRQUNsRixDQUFDOzs7Ozs7UUFaRCxJQUFJLFNBQVM7WUFDWCxPQUFPLElBQUksQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDO1FBQzNCLENBQUM7Ozs7UUFZRCxjQUFjO1lBQ1osSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFO2dCQUN0QixPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDO2FBQ3hEOztrQkFDSyxXQUFXLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxhQUFhLEVBQUU7WUFDM0MsT0FBTyxJQUFJLENBQUMsRUFBRSxDQUFDLHFCQUFxQixDQUFDLG1CQUFtQixFQUFFLEVBQUMsV0FBVyxFQUFDLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDeEYsQ0FBQzs7OztRQUVELGNBQWM7WUFDWixJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUU7Z0JBQ3RCLE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUM7YUFDeEQ7O2tCQUNLLFdBQVcsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLGFBQWEsRUFBRTtZQUMzQyxPQUFPLElBQUksQ0FBQyxFQUFFLENBQUMscUJBQXFCLENBQUMsaUJBQWlCLEVBQUUsRUFBQyxXQUFXLEVBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUN0RixDQUFDOzs7Z0JBNUNGLFVBQVU7Ozs7Z0JBVm1CLGVBQWU7O0lBdUQ3QyxlQUFDO0tBQUE7U0E1Q1ksUUFBUTs7Ozs7O0lBSW5CLDZCQUFxRDs7Ozs7SUFLckQsNkJBQXFEOzs7OztJQVV6QyxzQkFBMkIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7SW5qZWN0YWJsZX0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge05FVkVSLCBPYnNlcnZhYmxlfSBmcm9tICdyeGpzJztcblxuaW1wb3J0IHtFUlJfU1dfTk9UX1NVUFBPUlRFRCwgTmdzd0NvbW1DaGFubmVsLCBVcGRhdGVBY3RpdmF0ZWRFdmVudCwgVXBkYXRlQXZhaWxhYmxlRXZlbnR9IGZyb20gJy4vbG93X2xldmVsJztcblxuXG5cbi8qKlxuICogU3Vic2NyaWJlIHRvIHVwZGF0ZSBub3RpZmljYXRpb25zIGZyb20gdGhlIFNlcnZpY2UgV29ya2VyLCB0cmlnZ2VyIHVwZGF0ZVxuICogY2hlY2tzLCBhbmQgZm9yY2libHkgYWN0aXZhdGUgdXBkYXRlcy5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbkBJbmplY3RhYmxlKClcbmV4cG9ydCBjbGFzcyBTd1VwZGF0ZSB7XG4gIC8qKlxuICAgKiBFbWl0cyBhbiBgVXBkYXRlQXZhaWxhYmxlRXZlbnRgIGV2ZW50IHdoZW5ldmVyIGEgbmV3IGFwcCB2ZXJzaW9uIGlzIGF2YWlsYWJsZS5cbiAgICovXG4gIHJlYWRvbmx5IGF2YWlsYWJsZTogT2JzZXJ2YWJsZTxVcGRhdGVBdmFpbGFibGVFdmVudD47XG5cbiAgLyoqXG4gICAqIEVtaXRzIGFuIGBVcGRhdGVBY3RpdmF0ZWRFdmVudGAgZXZlbnQgd2hlbmV2ZXIgdGhlIGFwcCBoYXMgYmVlbiB1cGRhdGVkIHRvIGEgbmV3IHZlcnNpb24uXG4gICAqL1xuICByZWFkb25seSBhY3RpdmF0ZWQ6IE9ic2VydmFibGU8VXBkYXRlQWN0aXZhdGVkRXZlbnQ+O1xuXG4gIC8qKlxuICAgKiBUcnVlIGlmIHRoZSBTZXJ2aWNlIFdvcmtlciBpcyBlbmFibGVkIChzdXBwb3J0ZWQgYnkgdGhlIGJyb3dzZXIgYW5kIGVuYWJsZWQgdmlhXG4gICAqIGBTZXJ2aWNlV29ya2VyTW9kdWxlYCkuXG4gICAqL1xuICBnZXQgaXNFbmFibGVkKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnN3LmlzRW5hYmxlZDtcbiAgfVxuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgc3c6IE5nc3dDb21tQ2hhbm5lbCkge1xuICAgIGlmICghc3cuaXNFbmFibGVkKSB7XG4gICAgICB0aGlzLmF2YWlsYWJsZSA9IE5FVkVSO1xuICAgICAgdGhpcy5hY3RpdmF0ZWQgPSBORVZFUjtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5hdmFpbGFibGUgPSB0aGlzLnN3LmV2ZW50c09mVHlwZTxVcGRhdGVBdmFpbGFibGVFdmVudD4oJ1VQREFURV9BVkFJTEFCTEUnKTtcbiAgICB0aGlzLmFjdGl2YXRlZCA9IHRoaXMuc3cuZXZlbnRzT2ZUeXBlPFVwZGF0ZUFjdGl2YXRlZEV2ZW50PignVVBEQVRFX0FDVElWQVRFRCcpO1xuICB9XG5cbiAgY2hlY2tGb3JVcGRhdGUoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKCF0aGlzLnN3LmlzRW5hYmxlZCkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcihFUlJfU1dfTk9UX1NVUFBPUlRFRCkpO1xuICAgIH1cbiAgICBjb25zdCBzdGF0dXNOb25jZSA9IHRoaXMuc3cuZ2VuZXJhdGVOb25jZSgpO1xuICAgIHJldHVybiB0aGlzLnN3LnBvc3RNZXNzYWdlV2l0aFN0YXR1cygnQ0hFQ0tfRk9SX1VQREFURVMnLCB7c3RhdHVzTm9uY2V9LCBzdGF0dXNOb25jZSk7XG4gIH1cblxuICBhY3RpdmF0ZVVwZGF0ZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoIXRoaXMuc3cuaXNFbmFibGVkKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKEVSUl9TV19OT1RfU1VQUE9SVEVEKSk7XG4gICAgfVxuICAgIGNvbnN0IHN0YXR1c05vbmNlID0gdGhpcy5zdy5nZW5lcmF0ZU5vbmNlKCk7XG4gICAgcmV0dXJuIHRoaXMuc3cucG9zdE1lc3NhZ2VXaXRoU3RhdHVzKCdBQ1RJVkFURV9VUERBVEUnLCB7c3RhdHVzTm9uY2V9LCBzdGF0dXNOb25jZSk7XG4gIH1cbn1cbiJdfQ==