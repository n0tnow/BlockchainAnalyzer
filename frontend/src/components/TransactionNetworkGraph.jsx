import React, { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';

const TransactionNetworkGraph = ({ data }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!data) return;

    console.log('Data received:', data);

    const cy = cytoscape({
      container: containerRef.current,
      elements: {
        nodes: data.nodes.map(node => ({
          data: { 
            id: node.id, 
            label: node.label || node.id.substring(0, 6) + "..." + node.id.substring(node.id.length-4), 
            isAnomaly: node.isAnomaly,
            isMain: node.isMain || false
          }
        })),
        edges: data.edges.map(edge => ({
          data: { 
            source: edge.source, 
            target: edge.target, 
            value: edge.value,
            realValue: edge.realValue || edge.value
          }
        }))
      },
      style: [
        {
          selector: 'node',
          style: {
            'background-color': (ele) => {
              if (ele.data('isMain')) return '#ff9900'; // Ana adres
              if (ele.data('isAnomaly')) return '#ff4c4c'; // Anomali
              return '#00c6ff'; // Normal
            },
            'label': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'text-wrap': 'wrap',
            'text-max-width': '80px',
            'font-size': '10px',
            'width': (ele) => ele.data('isMain') ? 30 : 20,
            'height': (ele) => ele.data('isMain') ? 30 : 20,
          }
        },
        {
          selector: 'edge',
          style: {
            'width': (ele) => Math.max(1, Math.min(5, ele.data('value'))),
            'line-color': '#ccc',
            'target-arrow-color': '#ccc',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier'
          }
        }
      ],
      layout: {
        name: 'cose',
        idealEdgeLength: 100,
        nodeOverlap: 20,
        refresh: 20,
        fit: true,
        padding: 30,
        randomize: false,
        componentSpacing: 100,
        nodeRepulsion: 400000,
        edgeElasticity: 100,
        nestingFactor: 5,
        gravity: 80,
        numIter: 1000,
        initialTemp: 200,
        coolingFactor: 0.95,
        minTemp: 1.0
      }
    });

    // Hoverda bilgi göster
    cy.on('mouseover', 'node, edge', function(evt) {
      const ele = evt.target;
      if (ele.isNode()) {
        ele.style('label', ele.data('id'));
        ele.style('font-size', '12px');
        ele.style('text-background-opacity', 0.7);
        ele.style('text-background-color', '#000');
        ele.style('text-background-padding', '2px');
      } else if (ele.isEdge()) {
        const realValue = ele.data('realValue');
        if (realValue) {
          ele.style('label', `${realValue.toFixed(4)} ETH`);
          ele.style('font-size', '10px');
          ele.style('text-background-opacity', 0.7);
          ele.style('text-background-color', '#000');
          ele.style('text-background-padding', '2px');
        }
      }
    });

    cy.on('mouseout', 'node, edge', function(evt) {
      const ele = evt.target;
      if (ele.isNode()) {
        ele.style('label', ele.data('label'));
        ele.style('font-size', '10px');
        ele.style('text-background-opacity', 0);
      } else if (ele.isEdge()) {
        ele.style('label', '');
      }
    });

    return () => {
      cy.destroy();
    };
  }, [data]);

  return <div ref={containerRef} style={{ width: '100%', height: '600px' }} />;
};

export default TransactionNetworkGraph; 