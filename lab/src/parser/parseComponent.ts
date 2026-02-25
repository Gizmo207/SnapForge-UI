import { detectFramework, type Framework } from './detectFramework';
import { classifyComponent } from './classifyComponent';
import { inferName } from './inferName';
import { detectDependencies } from './detectDependencies';

export type ParsedComponent = {
  framework: Framework;
  name: string;
  category: string;
  subcategory: string;
  tags: string[];
  dependencies: string[];
};

export function parseComponent(code: string): ParsedComponent {
  const framework = detectFramework(code);
  const classification = classifyComponent(code);
  const name = inferName(code, classification);

  const dependencies = detectDependencies(code);

  return {
    framework,
    name,
    category: classification.category,
    subcategory: classification.subcategory,
    tags: classification.tags,
    dependencies,
  };
}
