/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { isPlatformBrowser } from '@angular/common';
import { APP_INITIALIZER, ApplicationRef, InjectionToken, Injector, NgModule, NgZone, PLATFORM_ID } from '@angular/core';
import { merge, of } from 'rxjs';
import { delay, filter, take } from 'rxjs/operators';
import { NgswCommChannel } from './low_level';
import { SwPush } from './push';
import { SwUpdate } from './update';
/**
 * Token that can be used to provide options for `ServiceWorkerModule` outside of
 * `ServiceWorkerModule.register()`.
 *
 * You can use this token to define a provider that generates the registration options at runtime,
 * for example via a function call:
 *
 * {@example service-worker/registration-options/module.ts region="registration-options"
 *     header="app.module.ts"}
 *
 * @publicApi
 */
export class SwRegistrationOptions {
}
export const SCRIPT = new InjectionToken('NGSW_REGISTER_SCRIPT');
export function ngswAppInitializer(injector, script, options, platformId) {
    const initializer = () => {
        if (!(isPlatformBrowser(platformId) && ('serviceWorker' in navigator) &&
            options.enabled !== false)) {
            return;
        }
        // Wait for service worker controller changes, and fire an INITIALIZE action when a new SW
        // becomes active. This allows the SW to initialize itself even if there is no application
        // traffic.
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (navigator.serviceWorker.controller !== null) {
                navigator.serviceWorker.controller.postMessage({ action: 'INITIALIZE' });
            }
        });
        let readyToRegister$;
        if (typeof options.registrationStrategy === 'function') {
            readyToRegister$ = options.registrationStrategy();
        }
        else {
            const [strategy, ...args] = (options.registrationStrategy || 'registerWhenStable:30000').split(':');
            switch (strategy) {
                case 'registerImmediately':
                    readyToRegister$ = of(null);
                    break;
                case 'registerWithDelay':
                    readyToRegister$ = delayWithTimeout(+args[0] || 0);
                    break;
                case 'registerWhenStable':
                    readyToRegister$ = !args[0] ? whenStable(injector) :
                        merge(whenStable(injector), delayWithTimeout(+args[0]));
                    break;
                default:
                    // Unknown strategy.
                    throw new Error(`Unknown ServiceWorker registration strategy: ${options.registrationStrategy}`);
            }
        }
        // Don't return anything to avoid blocking the application until the SW is registered.
        // Also, run outside the Angular zone to avoid preventing the app from stabilizing (especially
        // given that some registration strategies wait for the app to stabilize).
        // Catch and log the error if SW registration fails to avoid uncaught rejection warning.
        const ngZone = injector.get(NgZone);
        ngZone.runOutsideAngular(() => readyToRegister$.pipe(take(1)).subscribe(() => navigator.serviceWorker.register(script, { scope: options.scope })
            .catch(err => console.error('Service worker registration failed with:', err))));
    };
    return initializer;
}
function delayWithTimeout(timeout) {
    return of(null).pipe(delay(timeout));
}
function whenStable(injector) {
    const appRef = injector.get(ApplicationRef);
    return appRef.isStable.pipe(filter(stable => stable));
}
export function ngswCommChannelFactory(opts, platformId) {
    return new NgswCommChannel(isPlatformBrowser(platformId) && opts.enabled !== false ? navigator.serviceWorker :
        undefined);
}
/**
 * @publicApi
 */
let ServiceWorkerModule = /** @class */ (() => {
    class ServiceWorkerModule {
        /**
         * Register the given Angular Service Worker script.
         *
         * If `enabled` is set to `false` in the given options, the module will behave as if service
         * workers are not supported by the browser, and the service worker will not be registered.
         */
        static register(script, opts = {}) {
            return {
                ngModule: ServiceWorkerModule,
                providers: [
                    { provide: SCRIPT, useValue: script },
                    { provide: SwRegistrationOptions, useValue: opts },
                    {
                        provide: NgswCommChannel,
                        useFactory: ngswCommChannelFactory,
                        deps: [SwRegistrationOptions, PLATFORM_ID]
                    },
                    {
                        provide: APP_INITIALIZER,
                        useFactory: ngswAppInitializer,
                        deps: [Injector, SCRIPT, SwRegistrationOptions, PLATFORM_ID],
                        multi: true,
                    },
                ],
            };
        }
    }
    ServiceWorkerModule.decorators = [
        { type: NgModule, args: [{
                    providers: [SwPush, SwUpdate],
                },] }
    ];
    return ServiceWorkerModule;
})();
export { ServiceWorkerModule };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvc2VydmljZS13b3JrZXIvc3JjL21vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsaUJBQWlCLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUNsRCxPQUFPLEVBQUMsZUFBZSxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUF1QixRQUFRLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUM1SSxPQUFPLEVBQUMsS0FBSyxFQUFjLEVBQUUsRUFBQyxNQUFNLE1BQU0sQ0FBQztBQUMzQyxPQUFPLEVBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUVuRCxPQUFPLEVBQUMsZUFBZSxFQUFDLE1BQU0sYUFBYSxDQUFDO0FBQzVDLE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxRQUFRLENBQUM7QUFDOUIsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUVsQzs7Ozs7Ozs7Ozs7R0FXRztBQUNILE1BQU0sT0FBZ0IscUJBQXFCO0NBOEMxQztBQUVELE1BQU0sQ0FBQyxNQUFNLE1BQU0sR0FBRyxJQUFJLGNBQWMsQ0FBUyxzQkFBc0IsQ0FBQyxDQUFDO0FBRXpFLE1BQU0sVUFBVSxrQkFBa0IsQ0FDOUIsUUFBa0IsRUFBRSxNQUFjLEVBQUUsT0FBOEIsRUFDbEUsVUFBa0I7SUFDcEIsTUFBTSxXQUFXLEdBQUcsR0FBRyxFQUFFO1FBQ3ZCLElBQUksQ0FBQyxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsZUFBZSxJQUFJLFNBQVMsQ0FBQztZQUMvRCxPQUFPLENBQUMsT0FBTyxLQUFLLEtBQUssQ0FBQyxFQUFFO1lBQ2hDLE9BQU87U0FDUjtRQUVELDBGQUEwRjtRQUMxRiww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ZUFBZSxDQUN0QixpQkFBaUIsQ0FBQyxVQUFVLENBQUMsSUFBSSxJQUFJLENBQUMsT0FBTyxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ3pCLFNBQVMsQ0FBQyxDQUFDO0FBQzNFLENBQUM7QUFFRDs7R0FFRztBQUNIO0lBQUEsTUFHYSxtQkFBbUI7UUFDOUI7Ozs7O1dBS0c7UUFDSCxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQWMsRUFBRSxPQUE4QixFQUFFO1lBRTlELE9BQU87Z0JBQ0wsUUFBUSxFQUFFLG1CQUFtQjtnQkFDN0IsU0FBUyxFQUFFO29CQUNULEVBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFDO29CQUNuQyxFQUFDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFDO29CQUNoRDt3QkFDRSxPQUFPLEVBQUUsZUFBZTt3QkFDeEIsVUFBVSxFQUFFLHNCQUFzQjt3QkFDbEMsSUFBSSxFQUFFLENBQUMscUJBQXFCLEVBQUUsV0FBVyxDQUFDO3FCQUMzQztvQkFDRDt3QkFDRSxPQUFPLEVBQUUsZUFBZTt3QkFDeEIsVUFBVSxFQUFFLGtCQUFrQjt3QkFDOUIsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxxQkFBcUIsRUFBRSxXQUFXLENBQUM7d0JBQzVELEtBQUssRUFBRSxJQUFJO3FCQUNaO2lCQUNGO2FBQ0YsQ0FBQztRQUNKLENBQUM7OztnQkE5QkYsUUFBUSxTQUFDO29CQUNSLFNBQVMsRUFBRSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUM7aUJBQzlCOztJQTZCRCwwQkFBQztLQUFBO1NBNUJZLG1CQUFtQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge2lzUGxhdGZvcm1Ccm93c2VyfSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHtBUFBfSU5JVElBTElaRVIsIEFwcGxpY2F0aW9uUmVmLCBJbmplY3Rpb25Ub2tlbiwgSW5qZWN0b3IsIE1vZHVsZVdpdGhQcm92aWRlcnMsIE5nTW9kdWxlLCBOZ1pvbmUsIFBMQVRGT1JNX0lEfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7bWVyZ2UsIE9ic2VydmFibGUsIG9mfSBmcm9tICdyeGpzJztcbmltcG9ydCB7ZGVsYXksIGZpbHRlciwgdGFrZX0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQge05nc3dDb21tQ2hhbm5lbH0gZnJvbSAnLi9sb3dfbGV2ZWwnO1xuaW1wb3J0IHtTd1B1c2h9IGZyb20gJy4vcHVzaCc7XG5pbXBvcnQge1N3VXBkYXRlfSBmcm9tICcuL3VwZGF0ZSc7XG5cbi8qKlxuICogVG9rZW4gdGhhdCBjYW4gYmUgdXNlZCB0byBwcm92aWRlIG9wdGlvbnMgZm9yIGBTZXJ2aWNlV29ya2VyTW9kdWxlYCBvdXRzaWRlIG9mXG4gKiBgU2VydmljZVdvcmtlck1vZHVsZS5yZWdpc3RlcigpYC5cbiAqXG4gKiBZb3UgY2FuIHVzZSB0aGlzIHRva2VuIHRvIGRlZmluZSBhIHByb3ZpZGVyIHRoYXQgZ2VuZXJhdGVzIHRoZSByZWdpc3RyYXRpb24gb3B0aW9ucyBhdCBydW50aW1lLFxuICogZm9yIGV4YW1wbGUgdmlhIGEgZnVuY3Rpb24gY2FsbDpcbiAqXG4gKiB7QGV4YW1wbGUgc2VydmljZS13b3JrZXIvcmVnaXN0cmF0aW9uLW9wdGlvbnMvbW9kdWxlLnRzIHJlZ2lvbj1cInJlZ2lzdHJhdGlvbi1vcHRpb25zXCJcbiAqICAgICBoZWFkZXI9XCJhcHAubW9kdWxlLnRzXCJ9XG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgU3dSZWdpc3RyYXRpb25PcHRpb25zIHtcbiAgLyoqXG4gICAqIFdoZXRoZXIgdGhlIFNlcnZpY2VXb3JrZXIgd2lsbCBiZSByZWdpc3RlcmVkIGFuZCB0aGUgcmVsYXRlZCBzZXJ2aWNlcyAoc3VjaCBhcyBgU3dQdXNoYCBhbmRcbiAgICogYFN3VXBkYXRlYCkgd2lsbCBhdHRlbXB0IHRvIGNvbW11bmljYXRlIGFuZCBpbnRlcmFjdCB3aXRoIGl0LlxuICAgKlxuICAgKiBEZWZhdWx0OiB0cnVlXG4gICAqL1xuICBlbmFibGVkPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogQSBVUkwgdGhhdCBkZWZpbmVzIHRoZSBTZXJ2aWNlV29ya2VyJ3MgcmVnaXN0cmF0aW9uIHNjb3BlOyB0aGF0IGlzLCB3aGF0IHJhbmdlIG9mIFVSTHMgaXQgY2FuXG4gICAqIGNvbnRyb2wuIEl0IHdpbGwgYmUgdXNlZCB3aGVuIGNhbGxpbmdcbiAgICogW1NlcnZpY2VXb3JrZXJDb250YWluZXIjcmVnaXN0ZXIoKV0oaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL1NlcnZpY2VXb3JrZXJDb250YWluZXIvcmVnaXN0ZXIpLlxuICAgKi9cbiAgc2NvcGU/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIERlZmluZXMgdGhlIFNlcnZpY2VXb3JrZXIgcmVnaXN0cmF0aW9uIHN0cmF0ZWd5LCB3aGljaCBkZXRlcm1pbmVzIHdoZW4gaXQgd2lsbCBiZSByZWdpc3RlcmVkXG4gICAqIHdpdGggdGhlIGJyb3dzZXIuXG4gICAqXG4gICAqIFRoZSBkZWZhdWx0IGJlaGF2aW9yIG9mIHJlZ2lzdGVyaW5nIG9uY2UgdGhlIGFwcGxpY2F0aW9uIHN0YWJpbGl6ZXMgKGkuZS4gYXMgc29vbiBhcyB0aGVyZSBhcmVcbiAgICogbm8gcGVuZGluZyBtaWNyby0gYW5kIG1hY3JvLXRhc2tzKSwgaXMgZGVzaWduZWQgcmVnaXN0ZXIgdGhlIFNlcnZpY2VXb3JrZXIgYXMgc29vbiBhcyBwb3NzaWJsZVxuICAgKiBidXQgd2l0aG91dCBhZmZlY3RpbmcgdGhlIGFwcGxpY2F0aW9uJ3MgZmlyc3QgdGltZSBsb2FkLlxuICAgKlxuICAgKiBTdGlsbCwgdGhlcmUgbWlnaHQgYmUgY2FzZXMgd2hlcmUgeW91IHdhbnQgbW9yZSBjb250cm9sIG92ZXIgd2hlbiB0aGUgU2VydmljZVdvcmtlciBpc1xuICAgKiByZWdpc3RlcmVkIChlLmcuIHRoZXJlIG1pZ2h0IGJlIGEgbG9uZy1ydW5uaW5nIHRpbWVvdXQgb3IgcG9sbGluZyBpbnRlcnZhbCwgcHJldmVudGluZyB0aGUgYXBwXG4gICAqIHRvIHN0YWJpbGl6ZSkuIFRoZSBhdmFpbGFibGUgb3B0aW9uIGFyZTpcbiAgICpcbiAgICogLSBgcmVnaXN0ZXJXaGVuU3RhYmxlOjx0aW1lb3V0PmA6IFJlZ2lzdGVyIGFzIHNvb24gYXMgdGhlIGFwcGxpY2F0aW9uIHN0YWJpbGl6ZXMgKG5vIHBlbmRpbmdcbiAgICogICAgIG1pY3JvLS9tYWNyby10YXNrcykgYnV0IG5vIGxhdGVyIHRoYW4gYDx0aW1lb3V0PmAgbWlsbGlzZWNvbmRzLiBJZiB0aGUgYXBwIGhhc24ndFxuICAgKiAgICAgc3RhYmlsaXplZCBhZnRlciBgPHRpbWVvdXQ+YCBtaWxsaXNlY29uZHMgKGZvciBleGFtcGxlLCBkdWUgdG8gYSByZWN1cnJlbnQgYXN5bmNocm9ub3VzXG4gICAqICAgICB0YXNrKSwgdGhlIFNlcnZpY2VXb3JrZXIgd2lsbCBiZSByZWdpc3RlcmVkIGFueXdheS5cbiAgICogICAgIElmIGA8dGltZW91dD5gIGlzIG9taXR0ZWQsIHRoZSBTZXJ2aWNlV29ya2VyIHdpbGwgb25seSBiZSByZWdpc3RlcmVkIG9uY2UgdGhlIGFwcFxuICAgKiAgICAgc3RhYmlsaXplcy5cbiAgICogLSBgcmVnaXN0ZXJJbW1lZGlhdGVseWA6IFJlZ2lzdGVyIGltbWVkaWF0ZWx5LlxuICAgKiAtIGByZWdpc3RlcldpdGhEZWxheTo8dGltZW91dD5gOiBSZWdpc3RlciB3aXRoIGEgZGVsYXkgb2YgYDx0aW1lb3V0PmAgbWlsbGlzZWNvbmRzLiBGb3JcbiAgICogICAgIGV4YW1wbGUsIHVzZSBgcmVnaXN0ZXJXaXRoRGVsYXk6NTAwMGAgdG8gcmVnaXN0ZXIgdGhlIFNlcnZpY2VXb3JrZXIgYWZ0ZXIgNSBzZWNvbmRzLiBJZlxuICAgKiAgICAgYDx0aW1lb3V0PmAgaXMgb21pdHRlZCwgaXMgZGVmYXVsdHMgdG8gYDBgLCB3aGljaCB3aWxsIHJlZ2lzdGVyIHRoZSBTZXJ2aWNlV29ya2VyIGFzIHNvb25cbiAgICogICAgIGFzIHBvc3NpYmxlIGJ1dCBzdGlsbCBhc3luY2hyb25vdXNseSwgb25jZSBhbGwgcGVuZGluZyBtaWNyby10YXNrcyBhcmUgY29tcGxldGVkLlxuICAgKiAtIEFuIFtPYnNlcnZhYmxlXShndWlkZS9vYnNlcnZhYmxlcykgZmFjdG9yeSBmdW5jdGlvbjogQSBmdW5jdGlvbiB0aGF0IHJldHVybnMgYW4gYE9ic2VydmFibGVgLlxuICAgKiAgICAgVGhlIGZ1bmN0aW9uIHdpbGwgYmUgdXNlZCBhdCBydW50aW1lIHRvIG9idGFpbiBhbmQgc3Vic2NyaWJlIHRvIHRoZSBgT2JzZXJ2YWJsZWAgYW5kIHRoZVxuICAgKiAgICAgU2VydmljZVdvcmtlciB3aWxsIGJlIHJlZ2lzdGVyZWQgYXMgc29vbiBhcyB0aGUgZmlyc3QgdmFsdWUgaXMgZW1pdHRlZC5cbiAgICpcbiAgICogRGVmYXVsdDogJ3JlZ2lzdGVyV2hlblN0YWJsZSdcbiAgICovXG4gIHJlZ2lzdHJhdGlvblN0cmF0ZWd5Pzogc3RyaW5nfCgoKSA9PiBPYnNlcnZhYmxlPHVua25vd24+KTtcbn1cblxuZXhwb3J0IGNvbnN0IFNDUklQVCA9IG5ldyBJbmplY3Rpb25Ub2tlbjxzdHJpbmc+KCdOR1NXX1JFR0lTVEVSX1NDUklQVCcpO1xuXG5leHBvcnQgZnVuY3Rpb24gbmdzd0FwcEluaXRpYWxpemVyKFxuICAgIGluamVjdG9yOiBJbmplY3Rvciwgc2NyaXB0OiBzdHJpbmcsIG9wdGlvbnM6IFN3UmVnaXN0cmF0aW9uT3B0aW9ucyxcbiAgICBwbGF0Zm9ybUlkOiBzdHJpbmcpOiBGdW5jdGlvbiB7XG4gIGNvbnN0IGluaXRpYWxpemVyID0gKCkgPT4ge1xuICAgIGlmICghKGlzUGxhdGZvcm1Ccm93c2VyKHBsYXRmb3JtSWQpICYmICgnc2VydmljZVdvcmtlcicgaW4gbmF2aWdhdG9yKSAmJlxuICAgICAgICAgIG9wdGlvbnMuZW5hYmxlZCAhPT0gZmFsc2UpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gV2FpdCBmb3Igc2VydmljZSB3b3JrZXIgY29udHJvbGxlciBjaGFuZ2VzLCBhbmQgZmlyZSBhbiBJTklUSUFMSVpFIGFjdGlvbiB3aGVuIGEgbmV3IFNXXG4gICAgLy8gYmVjb21lcyBhY3RpdmUuIFRoaXMgYWxsb3dzIHRoZSBTVyB0byBpbml0aWFsaXplIGl0c2VsZiBldmVuIGlmIHRoZXJlIGlzIG5vIGFwcGxpY2F0aW9uXG4gICAgLy8gdHJhZmZpYy5cbiAgICBuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5hZGRFdmVudExpc3RlbmVyKCdjb250cm9sbGVyY2hhbmdlJywgKCkgPT4ge1xuICAgICAgaWYgKG5hdmlnYXRvci5zZXJ2aWNlV29ya2VyLmNvbnRyb2xsZXIgIT09IG51bGwpIHtcbiAgICAgICAgbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIuY29udHJvbGxlci5wb3N0TWVzc2FnZSh7YWN0aW9uOiAnSU5JVElBTElaRSd9KTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGxldCByZWFkeVRvUmVnaXN0ZXIkOiBPYnNlcnZhYmxlPHVua25vd24+O1xuXG4gICAgaWYgKHR5cGVvZiBvcHRpb25zLnJlZ2lzdHJhdGlvblN0cmF0ZWd5ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZWFkeVRvUmVnaXN0ZXIkID0gb3B0aW9ucy5yZWdpc3RyYXRpb25TdHJhdGVneSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBbc3RyYXRlZ3ksIC4uLmFyZ3NdID1cbiAgICAgICAgICAob3B0aW9ucy5yZWdpc3RyYXRpb25TdHJhdGVneSB8fCAncmVnaXN0ZXJXaGVuU3RhYmxlOjMwMDAwJykuc3BsaXQoJzonKTtcblxuICAgICAgc3dpdGNoIChzdHJhdGVneSkge1xuICAgICAgICBjYXNlICdyZWdpc3RlckltbWVkaWF0ZWx5JzpcbiAgICAgICAgICByZWFkeVRvUmVnaXN0ZXIkID0gb2YobnVsbCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3JlZ2lzdGVyV2l0aERlbGF5JzpcbiAgICAgICAgICByZWFkeVRvUmVnaXN0ZXIkID0gZGVsYXlXaXRoVGltZW91dCgrYXJnc1swXSB8fCAwKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAncmVnaXN0ZXJXaGVuU3RhYmxlJzpcbiAgICAgICAgICByZWFkeVRvUmVnaXN0ZXIkID0gIWFyZ3NbMF0gPyB3aGVuU3RhYmxlKGluamVjdG9yKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVyZ2Uod2hlblN0YWJsZShpbmplY3RvciksIGRlbGF5V2l0aFRpbWVvdXQoK2FyZ3NbMF0pKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAvLyBVbmtub3duIHN0cmF0ZWd5LlxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgYFVua25vd24gU2VydmljZVdvcmtlciByZWdpc3RyYXRpb24gc3RyYXRlZ3k6ICR7b3B0aW9ucy5yZWdpc3RyYXRpb25TdHJhdGVneX1gKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBEb24ndCByZXR1cm4gYW55dGhpbmcgdG8gYXZvaWQgYmxvY2tpbmcgdGhlIGFwcGxpY2F0aW9uIHVudGlsIHRoZSBTVyBpcyByZWdpc3RlcmVkLlxuICAgIC8vIEFsc28sIHJ1biBvdXRzaWRlIHRoZSBBbmd1bGFyIHpvbmUgdG8gYXZvaWQgcHJldmVudGluZyB0aGUgYXBwIGZyb20gc3RhYmlsaXppbmcgKGVzcGVjaWFsbHlcbiAgICAvLyBnaXZlbiB0aGF0IHNvbWUgcmVnaXN0cmF0aW9uIHN0cmF0ZWdpZXMgd2FpdCBmb3IgdGhlIGFwcCB0byBzdGFiaWxpemUpLlxuICAgIC8vIENhdGNoIGFuZCBsb2cgdGhlIGVycm9yIGlmIFNXIHJlZ2lzdHJhdGlvbiBmYWlscyB0byBhdm9pZCB1bmNhdWdodCByZWplY3Rpb24gd2FybmluZy5cbiAgICBjb25zdCBuZ1pvbmUgPSBpbmplY3Rvci5nZXQoTmdab25lKTtcbiAgICBuZ1pvbmUucnVuT3V0c2lkZUFuZ3VsYXIoXG4gICAgICAgICgpID0+IHJlYWR5VG9SZWdpc3RlciQucGlwZSh0YWtlKDEpKS5zdWJzY3JpYmUoXG4gICAgICAgICAgICAoKSA9PlxuICAgICAgICAgICAgICAgIG5hdmlnYXRvci5zZXJ2aWNlV29ya2VyLnJlZ2lzdGVyKHNjcmlwdCwge3Njb3BlOiBvcHRpb25zLnNjb3BlfSlcbiAgICAgICAgICAgICAgICAgICAgLmNhdGNoKGVyciA9PiBjb25zb2xlLmVycm9yKCdTZXJ2aWNlIHdvcmtlciByZWdpc3RyYXRpb24gZmFpbGVkIHdpdGg6JywgZXJyKSkpKTtcbiAgfTtcbiAgcmV0dXJuIGluaXRpYWxpemVyO1xufVxuXG5mdW5jdGlvbiBkZWxheVdpdGhUaW1lb3V0KHRpbWVvdXQ6IG51bWJlcik6IE9ic2VydmFibGU8dW5rbm93bj4ge1xuICByZXR1cm4gb2YobnVsbCkucGlwZShkZWxheSh0aW1lb3V0KSk7XG59XG5cbmZ1bmN0aW9uIHdoZW5TdGFibGUoaW5qZWN0b3I6IEluamVjdG9yKTogT2JzZXJ2YWJsZTx1bmtub3duPiB7XG4gIGNvbnN0IGFwcFJlZiA9IGluamVjdG9yLmdldChBcHBsaWNhdGlvblJlZik7XG4gIHJldHVybiBhcHBSZWYuaXNTdGFibGUucGlwZShmaWx0ZXIoc3RhYmxlID0+IHN0YWJsZSkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbmdzd0NvbW1DaGFubmVsRmFjdG9yeShcbiAgICBvcHRzOiBTd1JlZ2lzdHJhdGlvbk9wdGlvbnMsIHBsYXRmb3JtSWQ6IHN0cmluZyk6IE5nc3dDb21tQ2hhbm5lbCB7XG4gIHJldHVybiBuZXcgTmdzd0NvbW1DaGFubmVsKFxuICAgICAgaXNQbGF0Zm9ybUJyb3dzZXIocGxhdGZvcm1JZCkgJiYgb3B0cy5lbmFibGVkICE9PSBmYWxzZSA/IG5hdmlnYXRvci5zZXJ2aWNlV29ya2VyIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQpO1xufVxuXG4vKipcbiAqIEBwdWJsaWNBcGlcbiAqL1xuQE5nTW9kdWxlKHtcbiAgcHJvdmlkZXJzOiBbU3dQdXNoLCBTd1VwZGF0ZV0sXG59KVxuZXhwb3J0IGNsYXNzIFNlcnZpY2VXb3JrZXJNb2R1bGUge1xuICAvKipcbiAgICogUmVnaXN0ZXIgdGhlIGdpdmVuIEFuZ3VsYXIgU2VydmljZSBXb3JrZXIgc2NyaXB0LlxuICAgKlxuICAgKiBJZiBgZW5hYmxlZGAgaXMgc2V0IHRvIGBmYWxzZWAgaW4gdGhlIGdpdmVuIG9wdGlvbnMsIHRoZSBtb2R1bGUgd2lsbCBiZWhhdmUgYXMgaWYgc2VydmljZVxuICAgKiB3b3JrZXJzIGFyZSBub3Qgc3VwcG9ydGVkIGJ5IHRoZSBicm93c2VyLCBhbmQgdGhlIHNlcnZpY2Ugd29ya2VyIHdpbGwgbm90IGJlIHJlZ2lzdGVyZWQuXG4gICAqL1xuICBzdGF0aWMgcmVnaXN0ZXIoc2NyaXB0OiBzdHJpbmcsIG9wdHM6IFN3UmVnaXN0cmF0aW9uT3B0aW9ucyA9IHt9KTpcbiAgICAgIE1vZHVsZVdpdGhQcm92aWRlcnM8U2VydmljZVdvcmtlck1vZHVsZT4ge1xuICAgIHJldHVybiB7XG4gICAgICBuZ01vZHVsZTogU2VydmljZVdvcmtlck1vZHVsZSxcbiAgICAgIHByb3ZpZGVyczogW1xuICAgICAgICB7cHJvdmlkZTogU0NSSVBULCB1c2VWYWx1ZTogc2NyaXB0fSxcbiAgICAgICAge3Byb3ZpZGU6IFN3UmVnaXN0cmF0aW9uT3B0aW9ucywgdXNlVmFsdWU6IG9wdHN9LFxuICAgICAgICB7XG4gICAgICAgICAgcHJvdmlkZTogTmdzd0NvbW1DaGFubmVsLFxuICAgICAgICAgIHVzZUZhY3Rvcnk6IG5nc3dDb21tQ2hhbm5lbEZhY3RvcnksXG4gICAgICAgICAgZGVwczogW1N3UmVnaXN0cmF0aW9uT3B0aW9ucywgUExBVEZPUk1fSURdXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBwcm92aWRlOiBBUFBfSU5JVElBTElaRVIsXG4gICAgICAgICAgdXNlRmFjdG9yeTogbmdzd0FwcEluaXRpYWxpemVyLFxuICAgICAgICAgIGRlcHM6IFtJbmplY3RvciwgU0NSSVBULCBTd1JlZ2lzdHJhdGlvbk9wdGlvbnMsIFBMQVRGT1JNX0lEXSxcbiAgICAgICAgICBtdWx0aTogdHJ1ZSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfTtcbiAgfVxufVxuIl19