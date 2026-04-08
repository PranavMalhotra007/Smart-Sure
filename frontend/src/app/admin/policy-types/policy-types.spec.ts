import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PolicyTypes } from './policy-types';

describe('PolicyTypes', () => {
  let component: PolicyTypes;
  let fixture: ComponentFixture<PolicyTypes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PolicyTypes],
    }).compileComponents();

    fixture = TestBed.createComponent(PolicyTypes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
