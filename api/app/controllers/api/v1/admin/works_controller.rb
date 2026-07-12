class Api::V1::Admin::WorksController < ApplicationController
  before_action :set_work, only: [:show, :update, :destroy]

  ADMIN_FIELDS = [
    :id, :title, :description, :tech_stack, :video_url, :thumbnail_url,
    :github_url, :demo_url, :position, :published, :updated_at
  ].freeze

  def index
    works = Work.ordered
    render json: works.as_json(only: ADMIN_FIELDS)
  end

  def show
    render json: @work.as_json(only: ADMIN_FIELDS)
  end

  def create
    work = current_user.works.build(work_params)
    if work.save
      render json: work.as_json(only: ADMIN_FIELDS), status: :created
    else
      render json: { errors: work.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    if @work.update(work_params)
      render json: @work.as_json(only: ADMIN_FIELDS)
    else
      render json: { errors: @work.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    @work.destroy
    head :no_content
  end

  # PATCH /api/v1/admin/works/reorder
  # リクエスト: { "ids": [3, 1, 2] } ← 並べたい順にidを列挙
  def reorder
    ids = params.require(:ids)

    Work.transaction do
      ids.each_with_index do |id, index|
        Work.find(id).update!(position: index + 1)
      end
    end

    render json: Work.ordered.as_json(only: ADMIN_FIELDS)
  end

  private

  def set_work
    @work = Work.find(params[:id])
  end

  def work_params
    params.require(:work).permit(
      :title, :description, :video_url, :thumbnail_url,
      :github_url, :demo_url, :position, :published,
      tech_stack: []
    )
  end
end