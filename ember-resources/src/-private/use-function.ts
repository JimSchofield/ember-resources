/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
// typed-ember has not publihsed types for this yet
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { getValue } from '@glimmer/tracking/primitives/cache';
import { assert } from '@ember/debug';
// typed-ember has not publihsed types for this yet
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { invokeHelper } from '@ember/helper';

import { FN_SETUP, FunctionRunner } from './resources/function-runner';
import { DEFAULT_THUNK, normalizeThunk, proxyClass } from './utils';

import type { ArgsWrapper, Cache, ResourceFn } from './types';

type NonReactiveVanilla<Return, Args extends unknown[]> = [object, ResourceFn<Return, Args>];
type VanillaArgs<Return, Args extends unknown[]> = [object, ResourceFn<Return, Args>, () => Args];
type NonReactiveWithInitialValue<Return, Args extends unknown[]> = [
  object,
  NotFunction<Return>,
  ResourceFn<Return, Args>
];
type WithInitialValueArgs<Return, Args extends unknown[]> = [
  object,
  NotFunction<Return>,
  ResourceFn<Return, Args>,
  () => Args
];

type NotFunction<T> = T extends Function ? never : T;

type UseFunctionArgs<Return, Args extends unknown[]> =
  | NonReactiveVanilla<Return, Args>
  | NonReactiveWithInitialValue<Return, Args>
  | VanillaArgs<Return, Args>
  | WithInitialValueArgs<Return, Args>;

/**
 * For use in the body of a class.
 * Constructs a cached Resource that will reactively respond to tracked data changes
 *
 * @param {Object} destroyable context, e.g.: component instance aka "this"
 * @param {Function} theFunction the function to run with the return value available on .value
 */
export function useFunction<Return, Args extends unknown[] = unknown[]>(
  ...passed: NonReactiveVanilla<Return, Args>
): { value: Return };
/**
 * For use in the body of a class.
 * Constructs a cached Resource that will reactively respond to tracked data changes
 *
 * @param {Object} destroyable context, e.g.: component instance aka "this"
 * @param {Function} theFunction the function to run with the return value available on .value
 * @param {Function} thunk to generate / bind tracked data to the function so that the function can re-run when the tracked data updates
 */
export function useFunction<Return, Args extends unknown[] = unknown[]>(
  ...passed: VanillaArgs<Return, Args>
): { value: Return };
/**
 * For use in the body of a class.
 * Constructs a cached Resource that will reactively respond to tracked data changes
 *
 * @param {Object} destroyable context, e.g.: component instance aka "this"
 * @param {Object} initialValue - a non-function that matches the shape of the eventual return value of theFunction
 * @param {Function} theFunction the function to run with the return value available on .value
 * @param {Function} thunk to generate / bind tracked data to the function so that the function can re-run when the tracked data updates
 */
export function useFunction<Return, Args extends unknown[] = unknown[]>(
  ...passed: WithInitialValueArgs<Return, Args>
): { value: Return };
/**
 * For use in the body of a class.
 * Constructs a cached Resource that will reactively respond to tracked data changes
 *
 * @param {Object} destroyable context, e.g.: component instance aka "this"
 * @param {Object} initialValue - a non-function that matches the shape of the eventual return value of theFunction
 * @param {Function} theFunction the function to run with the return value available on .value
 */
export function useFunction<Return, Args extends unknown[] = unknown[]>(
  ...passed: NonReactiveWithInitialValue<Return, Args>
): { value: Return };

export function useFunction<Return, Args extends unknown[] = unknown[]>(
  ...passedArgs: UseFunctionArgs<Return, Args>
): { value: Return } {
  let [context] = passedArgs;
  let initialValue: Return | undefined;
  let fn: ResourceFn<Return, Args>;
  let thunk: (() => Args) | undefined;

  assert(
    `Expected second argument to useFunction to either be an initialValue or the function to run`,
    passedArgs[1] !== undefined
  );

  if (isVanillaArgs(passedArgs)) {
    fn = passedArgs[1];
    thunk = passedArgs[2];
  } else {
    initialValue = passedArgs[1];
    fn = passedArgs[2];
    thunk = passedArgs[3];
  }

  let target = buildUnproxiedFunctionResource<Return, Args>(
    context,
    initialValue,
    fn,
    (thunk || DEFAULT_THUNK) as () => Args
  );

  return proxyClass<any>(target) as { value: Return };
}

function isVanillaArgs<R, A extends unknown[]>(
  args: UseFunctionArgs<R, A>
): args is VanillaArgs<R, A> | NonReactiveVanilla<R, A> {
  return typeof args[1] === 'function';
}

/**
 * The function is wrapped in a bespoke resource per-function definition
 * because passing a vanilla function to invokeHelper would trigger a
 * different HelperManager, which we want to work a bit differently.
 * See:
 *  - function HelperManager in ember-could-get-used-to-this
 *  - Default Managers RFC
 *
 */
function buildUnproxiedFunctionResource<Return, ArgsList extends unknown[]>(
  context: object,
  initial: Return | undefined,
  fn: ResourceFn<Return, ArgsList>,
  thunk: () => ArgsList
): { value: Return } {
  let resource: Cache<Return>;

  return {
    get value(): Return {
      if (!resource) {
        resource = invokeHelper(context, FunctionRunner, () => {
          let normalized = normalizeThunk(thunk) || ({} as ArgsWrapper);

          if (!normalized.named) {
            normalized.named = {};
          }

          normalized.named[FN_SETUP] = {
            fn,
            initial,
          };

          return normalized;
        }) as Cache<Return>;
      }

      return getValue<Return>(resource);
    },
  };
}
