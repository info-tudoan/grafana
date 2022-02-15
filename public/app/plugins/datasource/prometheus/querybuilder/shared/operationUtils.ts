import { capitalize } from 'lodash';
import { QueryBuilderOperation, QueryBuilderOperationDef, QueryWithOperations } from './types';

export function functionRendererLeft(model: QueryBuilderOperation, def: QueryBuilderOperationDef, innerExpr: string) {
  const params = renderParams(model, def, innerExpr);
  const str = model.id + '(';

  if (innerExpr) {
    params.push(innerExpr);
  }

  return str + params.join(', ') + ')';
}

export function functionRendererRight(model: QueryBuilderOperation, def: QueryBuilderOperationDef, innerExpr: string) {
  const params = renderParams(model, def, innerExpr);
  const str = model.id + '(';

  if (innerExpr) {
    params.unshift(innerExpr);
  }

  return str + params.join(', ') + ')';
}

export function rangeRendererRightWithParams(
  model: QueryBuilderOperation,
  def: QueryBuilderOperationDef,
  innerExpr: string
) {
  if (def.params.length < 2) {
    throw `Cannot render a function with params of length [${def.params.length}]`;
  }

  // First, make sure the first parameter (that is the range vector) is translated if the user selected 'auto'
  let rangeVector = (model.params ?? [])[0] ?? 'auto';

  if (rangeVector === 'auto') {
    rangeVector = '$__rate_interval';
  }

  // Next frame the remaining parameters, but get rid of the first one because it's used to move the
  // instant vector into a range vector.
  const params = renderParams(
    {
      ...model,
      params: model.params.slice(1),
    },
    {
      ...def,
      params: def.params.slice(1),
      defaultParams: def.defaultParams.slice(1),
    },
    innerExpr
  );

  const str = model.id + '(';

  // Frame the first paramater as a range vector
  if (innerExpr) {
    params.unshift(`${innerExpr}[${rangeVector}]`);
  }

  // stick everything together
  return str + params.join(', ') + ')';
}

export function rangeRendererLeftWithParams(
  model: QueryBuilderOperation,
  def: QueryBuilderOperationDef,
  innerExpr: string
) {
  if (def.params.length < 2) {
    throw `Cannot render a function with params of length [${def.params.length}]`;
  }

  // First, make sure the first parameter (that is the range vector) is translated if the user selected 'auto'
  let rangeVector = (model.params ?? [])[0] ?? 'auto';

  if (rangeVector === 'auto') {
    rangeVector = '$__rate_interval';
  }

  // Next frame the remaining parameters, but get rid of the first one because it's used to move the
  // instant vector into a range vector.
  const params = renderParams(
    {
      ...model,
      params: model.params.slice(1),
    },
    {
      ...def,
      params: def.params.slice(1),
      defaultParams: def.defaultParams.slice(1),
    },
    innerExpr
  );

  const str = model.id + '(';

  // Frame the first paramater as a range vector
  if (innerExpr) {
    params.push(`${innerExpr}[${rangeVector}]`);
  }

  // stick everything together
  return str + params.join(', ') + ')';
}

function renderParams(model: QueryBuilderOperation, def: QueryBuilderOperationDef, innerExpr: string) {
  return (model.params ?? []).map((value, index) => {
    const paramDef = def.params[index];
    if (paramDef.type === 'string') {
      return '"' + value + '"';
    }

    return value;
  });
}

export function defaultAddOperationHandler<T extends QueryWithOperations>(def: QueryBuilderOperationDef, query: T) {
  const newOperation: QueryBuilderOperation = {
    id: def.id,
    params: def.defaultParams,
  };

  return {
    ...query,
    operations: [...query.operations, newOperation],
  };
}

export function getPromAndLokiOperationDisplayName(funcName: string) {
  return capitalize(funcName.replace(/_/g, ' '));
}
