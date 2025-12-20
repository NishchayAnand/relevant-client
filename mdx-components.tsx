import type { MDXComponents } from 'mdx/types';
import React, { ComponentPropsWithoutRef } from 'react';

type HeadingProps = ComponentPropsWithoutRef<'h1'>;
 
const components: MDXComponents = {
  h1: (props: HeadingProps) => (
    <h1 className="font-medium text-3xl pt-12 mb-0" {...props} />
  )
  
} satisfies MDXComponents;
 
export function useMDXComponents(): MDXComponents {
  return components
}