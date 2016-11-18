/*
 * Copyright (c) 2016 David Sehnal, licensed under Apache 2.0, See LICENSE file for more info.
 */

namespace LiteMol.Plugin.Views.Transform.Density {
    "use strict";
    
    import Transformer = Bootstrap.Entity.Transformer
    
    const IsoValue = (props: { controller: Bootstrap.Components.Transform.Controller<any>, onChangeValue: (v: number)=> void, onChangeType: (v: Bootstrap.Visualization.Density.IsoValueType)=> void, min: number, max: number, value: number, isSigma: boolean }) => 
        <Controls.ExpandableGroup
            select={<Controls.Slider label={props.isSigma ? 'Iso Value (\u03C3)' : 'Iso Value'} onChange={props.onChangeValue} min={props.min} max={props.max} value={props.value} step={0.001}  />}
            expander={<Controls.ControlGroupExpander isExpanded={(props.controller.latestState as any).showIsoValueType} onChange={e => props.controller.setState({ showIsoValueType: e } as any)}  />}
            options={[<Controls.Toggle onChange={v => props.onChangeType(v ? Bootstrap.Visualization.Density.IsoValueType.Sigma : Bootstrap.Visualization.Density.IsoValueType.Absolute) } value={props.isSigma} label='Relative (\u03C3)' />]}
            isExpanded={(props.controller.latestState as any).showIsoValueType}
            /> 

    function isoValueAbsoluteToSigma(data: Core.Formats.Density.Data, value: number, min: number, max: number) {
        let ret = (value - data.valuesInfo.mean) / data.valuesInfo.sigma;
        if (ret > max) return max;
        if (ret < min) return min;
        return ret;
    }

    function isoValueSigmaToAbsolute(data: Core.Formats.Density.Data, value: number) {
        let ret = data.valuesInfo.mean + value * data.valuesInfo.sigma;
        if (ret > data.valuesInfo.max) return data.valuesInfo.max;
        if (ret < data.valuesInfo.min) return data.valuesInfo.min;
        return ret;
    }
    
    export class ParseData extends Transform.ControllerBase<Bootstrap.Components.Transform.Controller<Transformer.Density.ParseDataParams>, Transformer.Density.ParseDataParams> {        
        protected renderControls() {            
            let params = this.params;
            let info: any[];
            let normalize = params.normalize!;
            let round = Bootstrap.Utils.round;
            if (this.isUpdate) {
                let data = (this.controller.entity as Bootstrap.Entity.Density.Data).props.data;
                return <div>
                    <Controls.RowText label='Format' value={params.format!.name} />
                    <Controls.RowText label='Sigma' value={round(data.valuesInfo.sigma, 3)} />
                    <Controls.RowText label='Mean' value={round(data.valuesInfo.mean, 3)} />
                    <Controls.RowText label='Value Range' value={`[${round(data.valuesInfo.min, 3)}, ${round(data.valuesInfo.max, 3)}]`} />
                    <Controls.Toggle onChange={v => this.controller.updateParams({ normalize: v }) } value={normalize} label='Normalized' />
                </div>;
            } 
                        
            return <div>
                <Controls.OptionsGroup options={LiteMol.Core.Formats.Density.SupportedFormats.All} caption={s => s.name} current={params.format}
                        onChange={(o) => this.updateParams({ format: o }) } label='Format' />
                <Controls.Toggle 
                    onChange={v => this.controller.updateParams({ normalize: v }) } value={normalize} label='Normalized' />
            </div>
        }        
    }
    
    export class CreateVisual extends Transform.ControllerBase<Bootstrap.Components.Transform.DensityVisual, Transformer.Density.CreateVisualParams> {        
        
        private surface() {           
            let data = Bootstrap.Tree.Node.findClosestNodeOfType(this.transformSourceEntity, [Bootstrap.Entity.Density.Data]) as Bootstrap.Entity.Density.Data;           
            let params = this.params.style!.params as Bootstrap.Visualization.Density.Params;
            let isSigma = params.isoValueType !== Bootstrap.Visualization.Density.IsoValueType.Absolute;

            return <IsoValue 
                controller={this.controller}
                onChangeValue={v => this.controller.updateStyleParams({ isoValue: v  })}
                onChangeType={v => {
                    if (v === params.isoValueType) return;
                    if (v === Bootstrap.Visualization.Density.IsoValueType.Absolute) {
                        this.controller.updateStyleParams({ isoValue: isoValueSigmaToAbsolute(data.props.data, params.isoValue!), isoValueType: v }); 
                    } else {
                        this.controller.updateStyleParams({ isoValue: isoValueAbsoluteToSigma(data.props.data, params.isoValue!, -5, 5), isoValueType: v });
                    }
                }}
                min={isSigma ? -5 : data.props.data.valuesInfo.min} max={isSigma ? 5 : data.props.data.valuesInfo.max} 
                isSigma={params.isoValueType !== Bootstrap.Visualization.Density.IsoValueType.Absolute}
                value={params.isoValue!} />;
            
            // let options = [
            //     <Controls.Slider label='Smoothing' onChange={v => this.controller.updateStyleParams({ smoothing: v  })} 
            //         min={0} max={10} step={1} value={params.smoothing} title='Number of laplacian smoothing itrations.' />
            // ];
            
            // let showTypeOptions =  (this.controller.latestState as any).showTypeOptions;
            // return <Controls.ExpandableGroup
            //         select={iso}
            //         expander={<Controls.ControlGroupExpander isExpanded={showTypeOptions} onChange={e => this.controller.setState({ showTypeOptions: e } as any)}  />}
            //         options={options}
            //         isExpanded={showTypeOptions} />;
        }
        
        private colors() {                      
            let params = this.params.style!.params as Bootstrap.Visualization.Density.Params;             
            let theme = this.params.style!.theme!;
            let colorControls: any[];
            
            let uc = theme.colors!.get('Uniform');
            let uniform = <Controls.ToggleColorPicker key={'Uniform'} label='Color' color={uc} onChange={c => this.controller.updateThemeColor('Uniform', c) } />
            
            let controls = theme.colors!
                    .filter((c, n) => n !== 'Uniform')
                    .map((c, n) => <Controls.ToggleColorPicker  key={n} label={n!} color={c!} onChange={c => this.controller.updateThemeColor(n!, c) } />).toArray();
                    
            controls.push(<TransparencyControl definition={theme.transparency!} onChange={d => this.controller.updateThemeTransparency(d) } />);
            let visualParams = this.params.style!.params as Bootstrap.Visualization.Density.Params;              
            controls.push(<Controls.Slider label='Smoothing' onChange={v => this.controller.updateStyleParams({ smoothing: v  })}  min={0} max={10} step={1} value={visualParams.smoothing!} title='Number of laplacian smoothing itrations.' />);
            controls.push(<Controls.Toggle onChange={v => this.controller.updateStyleParams({ isWireframe: v }) } value={params.isWireframe!} label='Wireframe' />)
                    
            let showThemeOptions =  (this.controller.latestState as any).showThemeOptions;
            return <Controls.ExpandableGroup
                    select={uniform}
                    expander={<Controls.ControlGroupExpander isExpanded={showThemeOptions} onChange={e => this.controller.setState({ showThemeOptions: e } as any)}  />}
                    options={controls}
                    isExpanded={showThemeOptions} />;
        }
        
        protected renderControls() {            
            let params = this.params;
            
            return <div>
                {this.surface()}
                {this.colors()}                
            </div>
        }        
    }
    
    
    export class CreateVisualBehaviour extends Transform.ControllerBase<Bootstrap.Components.Transform.DensityVisual, Transformer.Density.CreateVisualBehaviourParams> {        
        
        private surface() {           
            let data = Bootstrap.Tree.Node.findClosestNodeOfType(this.transformSourceEntity, [Bootstrap.Entity.Density.Data]) as Bootstrap.Entity.Density.Data;
            let params = this.params;           
            let visualParams = params.style!.params as Bootstrap.Visualization.Density.Params;
            let isSigma = visualParams.isoValueType !== Bootstrap.Visualization.Density.IsoValueType.Absolute;


            return <IsoValue 
                controller={this.controller}
                onChangeValue={v => this.controller.updateStyleParams({ isoValue: v  })}
                onChangeType={v => {
                    if (v === visualParams.isoValueType) return;
                    if (v === Bootstrap.Visualization.Density.IsoValueType.Absolute) {
                        this.controller.updateStyleParams({ isoValue: isoValueSigmaToAbsolute(data.props.data, visualParams.isoValue!), isoValueType: v }); 
                    } else {
                        this.controller.updateStyleParams({ isoValue: isoValueAbsoluteToSigma(data.props.data, visualParams.isoValue!, this.params.isoSigmaMin!, params.isoSigmaMax!), isoValueType: v });
                    }
                }}
                min={isSigma ? params.isoSigmaMin! : data.props.data.valuesInfo.min} max={isSigma ? params.isoSigmaMax! : data.props.data.valuesInfo.max} 
                isSigma={visualParams.isoValueType !== Bootstrap.Visualization.Density.IsoValueType.Absolute}
                value={visualParams.isoValue!} />; 
            
            
            //<IsoValue onChange={v => this.controller.updateStyleParams({ isoSigma: v  })} min={this.params.isoSigmaMin!} max={this.params.isoSigmaMax!} value={visualParams.isoSigma!} />
            
            // let options = [
            //     <Controls.Slider label='Smoothing' onChange={v => this.controller.updateStyleParams({ smoothing: v  })} 
            //         min={0} max={10} step={1} value={visualParams.smoothing} title='Number of laplacian smoothing itrations.' />
            // ];
            
            // let showTypeOptions =  (this.controller.latestState as any).showTypeOptions;
            // return <Controls.ExpandableGroup
            //         select={iso}
            //         expander={<Controls.ControlGroupExpander isExpanded={showTypeOptions} onChange={e => this.controller.setState({ showTypeOptions: e } as any)}  />}
            //         options={options}
            //         isExpanded={showTypeOptions} />;
        }
        
        private colors() {          
            let params = this.params.style!.params as Bootstrap.Visualization.Density.Params;                         
            let theme = this.params.style!.theme!;
            let colorControls: any[];
            
            let uc = theme.colors!.get('Uniform');
            let uniform = <Controls.ToggleColorPicker key={'Uniform'} label='Color' color={uc} onChange={c => this.controller.updateThemeColor('Uniform', c) } />
            
            let controls = theme.colors!
                    .filter((c, n) => n !== 'Uniform')
                    .map((c, n) => <Controls.ToggleColorPicker  key={n} label={n!} color={c!} onChange={c => this.controller.updateThemeColor(n!, c) } />).toArray();
                    
            controls.push(<TransparencyControl definition={theme.transparency!} onChange={d => this.controller.updateThemeTransparency(d) } />);
            let visualParams = this.params.style!.params as Bootstrap.Visualization.Density.Params;              
            controls.push(<Controls.Slider label='Smoothing' onChange={v => this.controller.updateStyleParams({ smoothing: v  })}  min={0} max={10} step={1} value={visualParams.smoothing!} title='Number of laplacian smoothing itrations.' />);
            controls.push(<Controls.Toggle onChange={v => this.controller.updateStyleParams({ isWireframe: v }) } value={params.isWireframe!} label='Wireframe' />)
            // controls.push(<Controls.Toggle 
            //         onChange={v => this.controller.updateStyleTheme({ wireframe: v }) } value={theme.wireframe} label='Wireframe' />);
                    
            let showThemeOptions =  (this.controller.latestState as any).showThemeOptions;
            return <Controls.ExpandableGroup
                    select={uniform}
                    expander={<Controls.ControlGroupExpander isExpanded={showThemeOptions} onChange={e => this.controller.setState({ showThemeOptions: e } as any)}  />}
                    options={controls}
                    isExpanded={showThemeOptions} />;
        }
        
        protected renderControls() {            
            let params = this.params;
            
            return <div>
                {this.surface()}
                {this.colors()}                
                 <Controls.Slider label='Radius' onChange={v => this.controller.updateRadius(v)} 
                    min={0} max={10} step={0.005} value={params.radius!} />
            </div>
        }        
    }
    
}